package org.matchia.matchiabackend.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.dto.MarketplaceChatbotRequest;
import org.matchia.matchiabackend.dto.MarketplaceChatbotResponse;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.ProductParameterValue;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.repository.DealerBankPartnershipRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Public, read-only marketplace assistant.  This service purposely does not
 * use the SaaS text-to-SQL assistant: every query is a fixed repository call
 * and is scoped to the marketplace resolved from the current request host.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceChatbotService {
    private static final int MAX_PRODUCTS = 5;
    private static final Pattern MAX_PRICE = Pattern.compile("(?:sous|moins de|under)\\s+([0-9][0-9 .,.]*)", Pattern.CASE_INSENSITIVE);
    private static final Pattern AMOUNT_WITH_CURRENCY = Pattern.compile("([0-9][0-9 .,.]*)\\s*(?:dt|tnd|dinar(?:s)?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern DURATION_MONTHS = Pattern.compile("(?:sur|pendant|duree|durée|de)\\s*(\\d{1,3})\\s*mois", Pattern.CASE_INSENSITIVE);
    private static final Pattern CONTRIBUTION_AMOUNT = Pattern.compile("(?:apport|avance)\\s*(?:de)?\\s*([0-9][0-9 .,.]*)", Pattern.CASE_INSENSITIVE);
    private static final Set<String> STOP_WORDS = Set.of("quel", "quelle", "quels", "quelles", "produit", "produits", "avec", "pour", "dans", "vous", "avez", "show", "moi", "liste", "disponible", "disponibles", "store", "magasin", "compare", "comparer", "prix", "est", "sont", "the", "and", "des", "les", "une", "un", "du", "de", "la", "le", "under", "moins", "sous", "cherche", "chercher", "recherche", "voudrais", "veux", "souhaite", "propose", "proposez", "montre", "montrez", "donne", "donnez", "peux", "peut", "avoir", "connais", "connaitre", "information", "informations", "aide", "bonjour", "merci", "svp", "silvousplait");

    private final MarketplaceChatbotContextResolver contextResolver;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final ProductRepository productRepository;
    private final ModuleStoreRepository moduleStoreRepository;
    private final DealerBankPartnershipRepository partnershipRepository;
    private final DealerProductService dealerProductService;
    private final Map<String, ConversationMemory> conversations = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public MarketplaceChatbotResponse answer(MarketplaceChatbotRequest request, HttpServletRequest httpRequest) {
        String message = request == null || request.message() == null ? "" : request.message().trim();
        if (message.isBlank()) {
            return new MarketplaceChatbotResponse("Bonjour. Posez-moi une question sur les produits, les stores ou les options de financement de cette marketplace.", "GENERAL_MARKETPLACE_HELP");
        }
        if (containsSensitiveRequest(message)) {
            return new MarketplaceChatbotResponse("Je ne peux pas acceder aux donnees privees, aux comptes, aux identifiants ou aux informations d'une autre marketplace.", "REFUSED");
        }

        Marketplace marketplace = contextResolver.resolve(httpRequest);
        MarketplaceStore store = resolveStore(marketplace, request == null ? null : request.storeId());
        Intent intent = intentOf(message);
        ConversationMemory memory = conversationFor(request == null ? null : request.conversationId(), marketplace, store);
        log.info("Marketplace chatbot query: marketplace={}, store={}, intent={}", marketplace.getId(), store == null ? null : store.getId(), intent);

        return switch (intent) {
            case BANK_INFORMATION, STORE_INFORMATION -> new MarketplaceChatbotResponse(bankOrStoreAnswer(marketplace, store), intent.name());
            case FINANCING_PARAMETERS, SIMULATION -> new MarketplaceChatbotResponse(financingAnswer(marketplace, store, message, intent, memory), intent.name());
            case PRODUCT_COMPARISON -> new MarketplaceChatbotResponse(comparisonAnswer(marketplace, store, message, memory), intent.name());
            case DEALER_INFORMATION -> new MarketplaceChatbotResponse(dealerAnswer(marketplace, store, message), intent.name());
            case PRODUCT_AVAILABILITY, PRODUCT_DETAILS, PRODUCT_SEARCH -> new MarketplaceChatbotResponse(productAnswer(marketplace, store, message, intent, memory), intent.name());
            case GENERAL_MARKETPLACE_HELP -> new MarketplaceChatbotResponse(generalAnswer(marketplace, store), intent.name());
        };
    }

    private MarketplaceStore resolveStore(Marketplace marketplace, Long storeId) {
        if (storeId == null) return null;
        MarketplaceStore store = marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(marketplace.getId(), storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store introuvable dans cette marketplace."));
        if (!Boolean.TRUE.equals(store.getEnabled()) || !Boolean.TRUE.equals(store.getVisible())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Store indisponible dans cette marketplace.");
        }
        return store;
    }

    private String bankOrStoreAnswer(Marketplace marketplace, MarketplaceStore store) {
        if (store != null) {
            String modules = store.getMarketplaceStoreModules() == null ? "" : store.getMarketplaceStoreModules().stream()
                    .filter(assignment -> assignment.getModule() != null && active(assignment.getEnabled(), assignment.getVisible()))
                    .map(assignment -> assignment.getModule().getName()).filter(name -> name != null && !name.isBlank())
                    .distinct().reduce((left, right) -> left + ", " + right).orElse("");
            return "Vous consultez le store " + store.getStore().getName() + " de la marketplace "
                    + marketplace.getBank().getName() + (modules.isBlank() ? "." : ". Modules actifs : " + modules + ".");
        }
        List<MarketplaceStore> stores = marketplaceStoreRepository.findByMarketplace_Id(marketplace.getId()).stream()
                .filter(this::isPublicStore).toList();
        String names = stores.stream().map(value -> value.getStore().getName()).reduce((left, right) -> left + ", " + right).orElse("aucun store");
        return "La marketplace " + marketplace.getBank().getName() + " propose : " + names + ".";
    }

    private String financingAnswer(Marketplace marketplace, MarketplaceStore store, String message, Intent intent, ConversationMemory memory) {
        if (store == null) return "Choisissez d'abord un store afin que je puisse vous orienter vers ses options de financement.";
        boolean simulatorActive = store.getMarketplaceStoreModules() != null && store.getMarketplaceStoreModules().stream()
                .anyMatch(assignment -> assignment.getModule() != null && active(assignment.getEnabled(), assignment.getVisible())
                        && fuzzyPhraseMatches(normalize(assignment.getModule().getName()), "simulateur"));
        if (!simulatorActive) return "Le simulateur n'est pas actif pour ce store. Les conditions exactes ne sont donc pas disponibles ici.";

        FinancingConfiguration configuration = financingConfiguration(store.getStore().getId());
        if (configuration == null) {
            return "Le simulateur est disponible pour ce store, mais ses paramètres de financement ne sont pas encore complets. Vous pouvez ouvrir le simulateur pour une estimation.";
        }

        String conditions = "Conditions du simulateur : taux annuel " + decimal(configuration.annualRate) + "%"
                + ", apport minimum " + contributionLabel(configuration)
                + ", durée de " + configuration.minDurationMonths + " à " + configuration.maxDurationMonths + " mois"
                + (configuration.maximumFinancingAmount == null ? "" : ", plafond " + money(configuration.maximumFinancingAmount))
                + ".";
        if (intent == Intent.FINANCING_PARAMETERS) return conditions;

        SimulationInput input = simulationInput(message, publicProducts(marketplace, store), memory, configuration);
        if (input.amount == null) {
            return conditions + " Pour calculer une mensualité, indiquez un produit ou un montant, par exemple : « simulation de 20 000 DT sur 36 mois » .";
        }
        SimulationEstimate estimate = estimate(input, configuration);
        String result = "Estimation indicative pour " + money(input.amount) + " sur " + input.durationMonths + " mois"
                + " : apport " + money(estimate.contribution) + ", montant financé " + money(estimate.financedAmount)
                + ", mensualité estimée " + money(estimate.monthlyPayment) + ".";
        if (estimate.fees.signum() > 0) result += " Frais de dossier : " + money(estimate.fees) + (configuration.feesFinanced ? " (inclus dans le financement)." : " (à régler séparément).");
        if (configuration.maximumFinancingAmount != null && estimate.requestedAmount.compareTo(configuration.maximumFinancingAmount) > 0) {
            result += " Attention : le montant demandé dépasse le plafond configuré de " + money(configuration.maximumFinancingAmount) + ".";
        }
        return result + " Cette estimation ne constitue pas une décision de financement.";
    }

    private String productAnswer(Marketplace marketplace, MarketplaceStore store, String message, Intent intent, ConversationMemory memory) {
        if (store == null) return "Choisissez un store pour rechercher ses produits disponibles.";
        List<PublicProduct> matches = matchingProducts(publicProducts(marketplace, store), message);
        if (matches.isEmpty()) return "Je n'ai trouve aucun produit correspondant actuellement disponible dans cette marketplace.";
        memory.products = matches;
        if (intent == Intent.PRODUCT_AVAILABILITY && matches.size() == 1) {
            PublicProduct product = matches.get(0);
            return product.name + " : " + product.availability + ".";
        }
        return formatProducts(matches, intent == Intent.PRODUCT_DETAILS);
    }

    private String dealerAnswer(Marketplace marketplace, MarketplaceStore store, String message) {
        if (store == null) return "Choisissez un store pour consulter ses concessionnaires partenaires.";
        List<PublicProduct> matches = matchingProducts(publicProducts(marketplace, store), message);
        List<String> dealers = matches.stream().map(PublicProduct::dealerName).filter(name -> name != null && !name.isBlank()).distinct().toList();
        if (dealers.isEmpty()) {
            dealers = partnershipRepository.findByBankIdOrderByRequestDateDesc(marketplace.getBank().getId()).stream()
                    .filter(partnership -> partnership.getStore() != null && partnership.getStore().getId().equals(store.getStore().getId()))
                    .filter(partnership -> partnership.getStatus() == DealerPartnershipStatusEnum.ACTIVE || partnership.getStatus() == DealerPartnershipStatusEnum.APPROVED)
                    .map(partnership -> partnership.getDealer() == null ? null : partnership.getDealer().getCompanyName())
                    .filter(name -> name != null && !name.isBlank()).distinct().toList();
        }
        if (dealers.isEmpty()) return "Je n'ai trouve aucun concessionnaire partenaire actif dans ce store.";
        return "Concessionnaires partenaires pour ce store : " + String.join(", ", dealers) + ".";
    }

    private String comparisonAnswer(Marketplace marketplace, MarketplaceStore store, String message, ConversationMemory memory) {
        if (store == null) return "Choisissez un store puis les produits a comparer.";
        boolean comparatorActive = store.getMarketplaceStoreModules() != null && store.getMarketplaceStoreModules().stream()
                .anyMatch(assignment -> assignment.getModule() != null && active(assignment.getEnabled(), assignment.getVisible())
                        && normalize(assignment.getModule().getName()).contains("compar"));
        if (!comparatorActive) return "Le comparateur n'est pas actif pour ce store.";
        List<PublicProduct> matches = matchingProducts(publicProducts(marketplace, store), message);
        if (matches.size() < 2 && referencesPreviousProducts(message)) matches = memory.products;
        if (matches.size() < 2) return "J'ai besoin de deux produits publies dans ce store pour lancer une comparaison.";
        PublicProduct first = matches.get(0);
        PublicProduct second = matches.get(1);
        List<String> differences = comparisonDetails(first, second);
        String answer = "Comparaison de " + first.name + " (" + money(first.price) + ") et " + second.name + " (" + money(second.price) + ").";
        if (!differences.isEmpty()) answer += " Différences relevées : " + String.join(" ; ", differences) + ".";
        return answer + " Ouvrez le comparateur pour visualiser toutes les caractéristiques côte à côte.";
    }

    private String generalAnswer(Marketplace marketplace, MarketplaceStore store) {
        String storeName = store == null ? "cette marketplace" : "le store " + store.getStore().getName();
        return "Je peux vous aider sur " + storeName + " : rechercher un produit même si son nom contient une faute, voir ses caractéristiques, son stock et son concessionnaire, expliquer les paramètres du simulateur, estimer une mensualité ou comparer deux produits.";
    }

    private List<PublicProduct> publicProducts(Marketplace marketplace, MarketplaceStore store) {
        List<PublicProduct> products = new ArrayList<>();
        productRepository.findByBank_IdOrderByCreatedAtDesc(marketplace.getBank().getId()).stream()
                .filter(product -> product.getStore() != null && product.getStore().getId().equals(store.getStore().getId()))
                .map(this::fromBankProduct).forEach(products::add);
        dealerProductService.publicProducts(marketplace.getBank().getSlug(), store.getStore().getId()).stream()
                .map(this::fromDealerProduct).forEach(products::add);
        return products;
    }

    private PublicProduct fromBankProduct(Product product) {
        return new PublicProduct(product.getName(), product.getDescription(), product.getPrice(), null, "Disponible", specifications(product.getParameterValues()));
    }

    private PublicProduct fromDealerProduct(DealerDtos.ProductView product) {
        String availability = product.availableStock() == null ? "Disponibilite a confirmer" : product.availableStock() <= 0 ? "Rupture de stock" : product.availableStock() <= 3 ? "Disponibilite limitee" : "Disponible";
        List<Specification> specifications = product.parameterValues() == null ? List.of() : product.parameterValues().stream()
                .map(value -> new Specification(value.name(), value.value())).toList();
        return new PublicProduct(product.name(), product.description(), product.price(), product.dealerName(), availability, specifications);
    }

    private List<Specification> specifications(Collection<ProductParameterValue> values) {
        if (values == null) return List.of();
        return values.stream().filter(value -> value != null && value.getParameterDefinition() != null)
                .map(value -> new Specification(value.getParameterDefinition().getName(), value.getValue())).toList();
    }

    private List<PublicProduct> matchingProducts(List<PublicProduct> products, String message) {
        BigDecimal maximumPrice = maximumPrice(message);
        Set<String> terms = searchTerms(message);
        return products.stream()
                .filter(product -> maximumPrice == null || product.price == null || product.price.compareTo(maximumPrice) <= 0)
                .filter(product -> terms.isEmpty() || score(product, terms) > 0)
                .sorted(Comparator.comparingInt((PublicProduct product) -> score(product, terms)).reversed().thenComparing(product -> product.name))
                .limit(MAX_PRODUCTS).toList();
    }

    private int score(PublicProduct product, Set<String> terms) {
        if (terms.isEmpty()) return 1;
        String searchable = normalize(product.name + " " + product.description + " " + product.specifications.stream().map(spec -> spec.name + " " + spec.value).reduce("", (left, right) -> left + " " + right));
        Set<String> searchableTerms = new HashSet<>(List.of(searchable.split("\\s+")));
        int score = 0;
        for (String term : terms) {
            if (searchable.contains(term)) {
                score += 3;
            } else if (searchableTerms.stream().anyMatch(candidate -> fuzzyTokenMatches(term, candidate))) {
                score += 1;
            }
        }
        return score;
    }

    private Set<String> searchTerms(String message) {
        Set<String> terms = new HashSet<>();
        for (String term : normalize(message).split("\\s+")) {
            if (term.length() >= 3 && !STOP_WORDS.contains(term) && !term.matches("\\d+")) {
                terms.add(term);
                if (term.endsWith("s") && term.length() > 4) terms.add(term.substring(0, term.length() - 1));
            }
        }
        return terms;
    }

    private BigDecimal maximumPrice(String message) {
        Matcher matcher = MAX_PRICE.matcher(message);
        if (!matcher.find()) return null;
        try {
            return new BigDecimal(matcher.group(1).replaceAll("[ .]", "").replace(',', '.'));
        } catch (NumberFormatException ignored) { return null; }
    }

    private String formatProducts(List<PublicProduct> products, boolean includeSpecifications) {
        StringBuilder answer = new StringBuilder("Voici les produits disponibles : ");
        for (int index = 0; index < products.size(); index++) {
            PublicProduct product = products.get(index);
            if (index > 0) answer.append(" ; ");
            answer.append(product.name).append(" — ").append(money(product.price)).append(" (").append(product.availability).append(")");
            if (includeSpecifications && !product.specifications.isEmpty()) {
                answer.append(" : ").append(product.specifications.stream().limit(6)
                        .map(spec -> spec.name + " " + spec.value).reduce((left, right) -> left + ", " + right).orElse(""));
            }
        }
        return answer.append('.').toString();
    }

    private List<String> comparisonDetails(PublicProduct first, PublicProduct second) {
        Map<String, String> firstSpecifications = specificationMap(first.specifications);
        Map<String, String> secondSpecifications = specificationMap(second.specifications);
        List<String> details = new ArrayList<>();
        if (first.price != null && second.price != null && first.price.compareTo(second.price) != 0) {
            details.add("prix : " + money(first.price) + " contre " + money(second.price));
        }
        for (Map.Entry<String, String> entry : firstSpecifications.entrySet()) {
            String other = secondSpecifications.get(entry.getKey());
            if (other != null && !normalize(other).equals(normalize(entry.getValue()))) {
                details.add(entry.getKey() + " : " + entry.getValue() + " contre " + other);
            }
            if (details.size() == 5) break;
        }
        return details;
    }

    private Map<String, String> specificationMap(List<Specification> specifications) {
        Map<String, String> values = new java.util.LinkedHashMap<>();
        if (specifications == null) return values;
        for (Specification specification : specifications) {
            if (specification == null || specification.name == null || specification.value == null) continue;
            values.putIfAbsent(normalize(specification.name), specification.value);
        }
        return values;
    }

    private FinancingConfiguration financingConfiguration(Long storeId) {
        ModuleStore simulator = moduleStoreRepository.findByStoreIdAndActifTrueOrderByOrdreAsc(storeId).stream()
                .filter(assignment -> assignment.getModule() != null && fuzzyPhraseMatches(normalize(assignment.getModule().getName()), "simulateur"))
                .findFirst().orElse(null);
        if (simulator == null) return null;

        List<ModuleStoreParameter> parameters = simulator.getParameters() == null ? List.of() : simulator.getParameters();
        BigDecimal annualRate = parameterNumber(parameters, "annualinterestrate", "interestrate", "tauxinteret", "taux");
        BigDecimal minContributionRate = parameterNumber(parameters, "minimumcontributionrate", "minimumcontributionpercentage", "contributionminpercentage", "apportminpourcentage");
        BigDecimal minContributionAmount = parameterNumber(parameters, "minimumcontributionamount", "contributionminamount", "apportminmontant", "apportmin");
        BigDecimal minDuration = parameterNumber(parameters, "mindurationmonths", "minimumdurationmonths", "minimumduration", "dureeminimum", "dureemin");
        BigDecimal maxDuration = parameterNumber(parameters, "maxdurationmonths", "maximumdurationmonths", "maximumduration", "dureemaximum", "dureemax");
        BigDecimal feeAmount = parameterNumber(parameters, "filefeeamount", "filefeesamount", "fraisdossiermontant", "processingfeeamount");
        BigDecimal feePercentage = parameterNumber(parameters, "filefeepercentage", "fraisdossierpourcentage", "fraisdedossierpourcentage", "fraisdossier", "fraisdedossier", "fraisapplicationpourcentage", "processingfeepercentage");
        BigDecimal maximumFinancingAmount = parameterNumber(parameters, "maxfinancingamount", "maximumfinancingamount", "plafondfinancement", "financingceiling");
        String feeMode = parameterText(parameters, "filefeemode", "fraisdossiermode", "feepaymentmode", "feesmode", "feessettlement", "fraissepares", "fraisseparees");

        if (annualRate == null || minDuration == null || maxDuration == null || minDuration.compareTo(BigDecimal.ONE) < 0 || maxDuration.compareTo(minDuration) < 0
                || (minContributionRate == null && minContributionAmount == null)) return null;
        return new FinancingConfiguration(
                annualRate.max(BigDecimal.ZERO),
                minContributionRate == null ? BigDecimal.ZERO : minContributionRate.max(BigDecimal.ZERO),
                minContributionAmount == null ? null : minContributionAmount.max(BigDecimal.ZERO),
                minDuration.setScale(0, RoundingMode.CEILING).intValue(),
                maxDuration.setScale(0, RoundingMode.FLOOR).intValue(),
                maximumFinancingAmount == null ? null : maximumFinancingAmount.max(BigDecimal.ZERO),
                feeAmount == null ? null : feeAmount.max(BigDecimal.ZERO),
                feePercentage == null ? null : feePercentage.max(BigDecimal.ZERO),
                feeMode != null && containsAny(normalize(feeMode), "finance", "inclus", "integr")
        );
    }

    private BigDecimal parameterNumber(List<ModuleStoreParameter> parameters, String... aliases) {
        String value = parameterText(parameters, aliases);
        if (value == null || value.isBlank()) return null;
        try {
            String cleaned = value.trim().replaceAll("\\s", "").replaceAll("[^0-9,.-]", "");
            if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') >= 0) cleaned = cleaned.replace(".", "").replace(',', '.');
            else cleaned = cleaned.replace(',', '.');
            return new BigDecimal(cleaned);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String parameterText(List<ModuleStoreParameter> parameters, String... aliases) {
        for (ModuleStoreParameter parameter : parameters) {
            if (parameter == null) continue;
            String key = normalize((parameter.getCode() == null ? "" : parameter.getCode()) + " " + (parameter.getName() == null ? "" : parameter.getName())).replace(" ", "");
            for (String alias : aliases) if (key.contains(alias) && parameter.getValue() != null && !parameter.getValue().isBlank()) return parameter.getValue();
        }
        return null;
    }

    private SimulationInput simulationInput(String message, List<PublicProduct> products, ConversationMemory memory, FinancingConfiguration configuration) {
        List<PublicProduct> matches = matchingProducts(products, message);
        if (matches.isEmpty() && referencesPreviousProducts(message)) matches = memory.products;
        BigDecimal amount = amountInMessage(message);
        if (amount == null && matches.size() == 1) amount = matches.get(0).price;
        int duration = integerInMessage(DURATION_MONTHS, message, configuration.minDurationMonths);
        duration = Math.min(Math.max(duration, configuration.minDurationMonths), configuration.maxDurationMonths);
        BigDecimal contribution = amountInMatcher(CONTRIBUTION_AMOUNT, message);
        if (contribution == null && amount != null) contribution = configuration.minContributionAmount == null
                ? amount.multiply(configuration.minContributionRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : configuration.minContributionAmount;
        return new SimulationInput(amount, duration, contribution == null ? BigDecimal.ZERO : contribution.max(BigDecimal.ZERO));
    }

    private SimulationEstimate estimate(SimulationInput input, FinancingConfiguration configuration) {
        BigDecimal requestedAmount = input.amount.subtract(input.contribution).max(BigDecimal.ZERO);
        BigDecimal fees = configuration.feeAmount != null ? configuration.feeAmount
                : configuration.feePercentage == null ? BigDecimal.ZERO
                : requestedAmount.multiply(configuration.feePercentage).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal financedAmount = configuration.feesFinanced ? requestedAmount.add(fees) : requestedAmount;
        double monthlyRate = configuration.annualRate.doubleValue() / 1200d;
        double payment = monthlyRate == 0d ? financedAmount.doubleValue() / input.durationMonths
                : financedAmount.doubleValue() * monthlyRate / (1d - Math.pow(1d + monthlyRate, -input.durationMonths));
        return new SimulationEstimate(requestedAmount, input.contribution, fees, financedAmount, BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal amountInMessage(String message) {
        Matcher matcher = AMOUNT_WITH_CURRENCY.matcher(message);
        return matcher.find() ? parseAmount(matcher.group(1)) : null;
    }

    private BigDecimal amountInMatcher(Pattern pattern, String message) {
        Matcher matcher = pattern.matcher(message);
        return matcher.find() ? parseAmount(matcher.group(1)) : null;
    }

    private BigDecimal parseAmount(String value) {
        try { return new BigDecimal(value.replaceAll("[ .]", "").replace(',', '.')); }
        catch (NumberFormatException ignored) { return null; }
    }

    private int integerInMessage(Pattern pattern, String message, int fallback) {
        Matcher matcher = pattern.matcher(message);
        if (!matcher.find()) return fallback;
        try { return Integer.parseInt(matcher.group(1)); }
        catch (NumberFormatException ignored) { return fallback; }
    }

    private String contributionLabel(FinancingConfiguration configuration) {
        return configuration.minContributionAmount == null ? decimal(configuration.minContributionRate) + "%" : money(configuration.minContributionAmount);
    }

    private String decimal(BigDecimal value) { return value.stripTrailingZeros().toPlainString().replace('.', ','); }

    private boolean containsSensitiveRequest(String message) {
        String normalized = normalize(message);
        return List.of("password", "motdepasse", "token", "jwt", "utilisateur", "users", "financingrequest", "demandedefinancement", "basededonnees", "database", "autrebanque", "allbanks").stream().anyMatch(normalized::contains);
    }

    private ConversationMemory conversationFor(String conversationId, Marketplace marketplace, MarketplaceStore store) {
        if (conversationId == null || !conversationId.matches("[A-Za-z0-9_-]{8,100}")) return ConversationMemory.empty();
        String key = marketplace.getId() + ":" + (store == null ? "general" : store.getId()) + ":" + conversationId;
        return conversations.compute(key, (ignored, existing) -> existing == null || existing.expired()
                ? ConversationMemory.empty() : existing.touch());
    }

    private boolean referencesPreviousProducts(String message) {
        String normalized = normalize(message);
        return containsAny(normalized, "premier", "deuxpremier", "first", "these", "ceuxci");
    }

    private Intent intentOf(String message) {
        String normalized = normalize(message);
        if (containsAnyFuzzy(normalized, "comparer", "comparaison", "meilleur", "moins cher")) return Intent.PRODUCT_COMPARISON;
        if (containsAnyFuzzy(normalized, "simuler", "simulation", "mensualite", "remboursement", "duree")) return Intent.SIMULATION;
        if (containsAnyFuzzy(normalized, "taux", "apport", "frais", "financement")) return Intent.FINANCING_PARAMETERS;
        if (containsAnyFuzzy(normalized, "concessionnaire", "dealer", "vendeur", "propose par", "fournit")) return Intent.DEALER_INFORMATION;
        if (containsAnyFuzzy(normalized, "stock", "disponibilite", "rupture")) return Intent.PRODUCT_AVAILABILITY;
        if (containsAnyFuzzy(normalized, "caracteristique", "specification", "ram", "batterie", "surface", "transmission", "marque", "modele", "detail")) return Intent.PRODUCT_DETAILS;
        if (containsAnyFuzzy(normalized, "store", "magasin", "marketplace", "banque", "service")) return Intent.STORE_INFORMATION;
        if (containsAnyFuzzy(normalized, "produit", "telephone", "voiture", "vehicule", "mobile", "medical", "immobilier", "appartement", "maison")) return Intent.PRODUCT_SEARCH;
        return Intent.GENERAL_MARKETPLACE_HELP;
    }

    private boolean isPublicStore(MarketplaceStore store) { return active(store.getEnabled(), store.getVisible()); }
    private boolean active(Boolean enabled, Boolean visible) { return !Boolean.FALSE.equals(enabled) && !Boolean.FALSE.equals(visible); }
    private boolean containsAny(String text, String... values) { for (String value : values) if (text.contains(value)) return true; return false; }
    private boolean containsAnyFuzzy(String text, String... values) { for (String value : values) if (fuzzyPhraseMatches(text, value)) return true; return false; }
    private boolean fuzzyPhraseMatches(String text, String phrase) {
        String normalizedPhrase = normalize(phrase);
        if (text.contains(normalizedPhrase)) return true;
        for (String expected : normalizedPhrase.split("\\s+")) {
            if (expected.length() < 3) continue;
            boolean present = false;
            for (String actual : text.split("\\s+")) {
                if (fuzzyTokenMatches(expected, actual)) { present = true; break; }
            }
            if (!present) return false;
        }
        return !normalizedPhrase.isBlank();
    }
    private boolean fuzzyTokenMatches(String expected, String actual) {
        if (expected.equals(actual) || expected.startsWith(actual) && actual.length() >= 4 || actual.startsWith(expected) && expected.length() >= 4) return true;
        if (expected.length() < 4 || actual.length() < 4) return false;
        int permittedDistance = Math.max(1, Math.min(2, Math.max(expected.length(), actual.length()) / 4));
        return levenshtein(expected, actual) <= permittedDistance;
    }
    private int levenshtein(String first, String second) {
        int[] previous = new int[second.length() + 1];
        int[] current = new int[second.length() + 1];
        for (int index = 0; index <= second.length(); index++) previous[index] = index;
        for (int firstIndex = 1; firstIndex <= first.length(); firstIndex++) {
            current[0] = firstIndex;
            for (int secondIndex = 1; secondIndex <= second.length(); secondIndex++) {
                int substitution = previous[secondIndex - 1] + (first.charAt(firstIndex - 1) == second.charAt(secondIndex - 1) ? 0 : 1);
                current[secondIndex] = Math.min(Math.min(current[secondIndex - 1] + 1, previous[secondIndex] + 1), substitution);
            }
            int[] swap = previous; previous = current; current = swap;
        }
        return previous[second.length()];
    }
    private String normalize(String value) { return value == null ? "" : java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim(); }
    private String money(BigDecimal amount) { return amount == null ? "prix non communique" : NumberFormat.getNumberInstance(Locale.FRANCE).format(amount) + " DT"; }

    private enum Intent { PRODUCT_SEARCH, PRODUCT_DETAILS, PRODUCT_AVAILABILITY, PRODUCT_COMPARISON, DEALER_INFORMATION, BANK_INFORMATION, STORE_INFORMATION, FINANCING_PARAMETERS, SIMULATION, GENERAL_MARKETPLACE_HELP }
    private record Specification(String name, String value) { }
    private record PublicProduct(String name, String description, BigDecimal price, String dealerName, String availability, List<Specification> specifications) { }
    private record FinancingConfiguration(BigDecimal annualRate, BigDecimal minContributionRate, BigDecimal minContributionAmount,
                                          int minDurationMonths, int maxDurationMonths, BigDecimal maximumFinancingAmount,
                                          BigDecimal feeAmount, BigDecimal feePercentage, boolean feesFinanced) { }
    private record SimulationInput(BigDecimal amount, int durationMonths, BigDecimal contribution) { }
    private record SimulationEstimate(BigDecimal requestedAmount, BigDecimal contribution, BigDecimal fees,
                                      BigDecimal financedAmount, BigDecimal monthlyPayment) { }
    private static final class ConversationMemory {
        private Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));
        private List<PublicProduct> products = List.of();
        private static ConversationMemory empty() { return new ConversationMemory(); }
        private boolean expired() { return Instant.now().isAfter(expiresAt); }
        private ConversationMemory touch() { expiresAt = Instant.now().plus(Duration.ofMinutes(30)); return this; }
    }
}
