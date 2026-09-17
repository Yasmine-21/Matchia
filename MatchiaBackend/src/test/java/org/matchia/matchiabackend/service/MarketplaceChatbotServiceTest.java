package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceChatbotRequest;
import org.matchia.matchiabackend.dto.MarketplaceChatbotResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.DealerBankPartnership;
import org.matchia.matchiabackend.entity.DealerProduct;
import org.matchia.matchiabackend.entity.DealerProductParameterValue;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.ProductPublicationRequest;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.DealerProductStatusEnum;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.DealerBankPartnershipRepository;
import org.matchia.matchiabackend.repository.ProductRepository;
import org.matchia.matchiabackend.repository.ProductPublicationRequestRepository;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class MarketplaceChatbotServiceTest {
    private MarketplaceRepository marketplaceRepository;
    private MarketplaceStoreRepository marketplaceStoreRepository;
    private ProductRepository productRepository;
    private ModuleStoreRepository moduleStoreRepository;
    private DealerBankPartnershipRepository partnershipRepository;
    private ProductPublicationRequestRepository publicationRepository;
    private MarketplaceChatbotService service;
    private Marketplace marketplace;
    private MarketplaceStore marketplaceStore;

    @BeforeEach
    void setUp() {
        marketplaceRepository = mock(MarketplaceRepository.class);
        marketplaceStoreRepository = mock(MarketplaceStoreRepository.class);
        productRepository = mock(ProductRepository.class);
        moduleStoreRepository = mock(ModuleStoreRepository.class);
        partnershipRepository = mock(DealerBankPartnershipRepository.class);
        publicationRepository = mock(ProductPublicationRequestRepository.class);
        service = new MarketplaceChatbotService(new MarketplaceChatbotContextResolver(marketplaceRepository), marketplaceStoreRepository, productRepository, moduleStoreRepository, partnershipRepository, publicationRepository);

        Bank bank = new Bank();
        bank.setId(10L); bank.setName("Banque Test"); bank.setSlug("banque-test");
        marketplace = new Marketplace();
        marketplace.setId(20L); marketplace.setBank(bank); marketplace.setStatus(MarketplaceStatusEnum.active);
        Store store = new Store();
        store.setId(30L); store.setName("mobile");
        marketplaceStore = new MarketplaceStore();
        marketplaceStore.setId(40L); marketplaceStore.setStore(store); marketplaceStore.setMarketplace(marketplace);
        marketplaceStore.setEnabled(true); marketplaceStore.setVisible(true); marketplaceStore.setMarketplaceStoreModules(List.of());

        when(marketplaceRepository.findByBank_Slug("banque-test")).thenReturn(Optional.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(20L, 30L)).thenReturn(Optional.of(marketplaceStore));
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(anyLong(), anyLong(), any())).thenReturn(List.of());
    }

    @Test
    void returnsOnlyProductsFromTheResolvedMarketplaceAndStore() {
        Product matching = new Product();
        matching.setName("Telephone Nova"); matching.setDescription("5G et grande batterie"); matching.setPrice(new BigDecimal("1500")); matching.setStore(marketplaceStore.getStore());
        Product differentStore = new Product();
        Store vehicle = new Store(); vehicle.setId(31L); vehicle.setName("vehicule");
        differentStore.setName("Voiture privee"); differentStore.setStore(vehicle);
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(matching, differentStore));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Montrez les telephones sous 2000", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_SEARCH");
        assertThat(response.reply()).contains("Telephone Nova").doesNotContain("Voiture privee");
        verify(productRepository).findByBank_IdOrderByCreatedAtDesc(10L);
        verify(publicationRepository).findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(eq(20L), eq(30L), any());
    }

    @Test
    void refusesSensitiveQuestionsBeforeAnyDatabaseLookup() {
        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Montre moi tous les utilisateurs et les paiements", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("REFUSED");
        verifyNoInteractions(marketplaceRepository, marketplaceStoreRepository, productRepository, publicationRepository);
    }

    @Test
    void answersAPlainGreetingWithoutQueryingMarketplaceData() {
        MarketplaceChatbotResponse response = service.answer(
                new MarketplaceChatbotRequest("Bonjour", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("GREETING");
        assertThat(response.reply()).isEqualTo("Bonjour, comment puis-je vous aider ?");
        verifyNoInteractions(marketplaceRepository, marketplaceStoreRepository, productRepository,
                moduleStoreRepository, partnershipRepository, publicationRepository);
    }

    @Test
    void rejectsAStoreOutsideTheResolvedMarketplace() {
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(20L, 999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.answer(new MarketplaceChatbotRequest("produits", 999L, null), tenantRequest()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Store introuvable");
        verify(productRepository, never()).findByBank_IdOrderByCreatedAtDesc(anyLong());
    }

    @Test
    void findsAProductWhenTheQuestionContainsSmallTypos() {
        Product product = new Product();
        product.setName("Telephone Nova"); product.setDescription("Smartphone avec grande batterie");
        product.setPrice(new BigDecimal("1500")); product.setStore(marketplaceStore.getStore());
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(product));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Je cherche le telephne nava", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_SEARCH");
        assertThat(response.reply()).contains("Telephone Nova");
    }

    @Test
    void readsApprovedDealerProductsWithoutConsultingPartnershipContracts() {
        Dealer dealer = new Dealer();
        dealer.setId(50L); dealer.setCompanyName("Mobile Partner"); dealer.setStatus(DealerStatusEnum.ACTIVE);
        DealerProduct product = new DealerProduct();
        product.setId(60L); product.setDealer(dealer); product.setStore(marketplaceStore.getStore());
        product.setName("Smartphone Horizon"); product.setDescription("Telephone 5G");
        product.setPrice(new BigDecimal("1800")); product.setAvailableStock(8);
        product.setStatus(DealerProductStatusEnum.ACTIVE); product.setParameterValues(List.of());
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(70L); partnership.setStatus(DealerPartnershipStatusEnum.ACTIVE);
        ProductPublicationRequest publication = new ProductPublicationRequest();
        publication.setProduct(product); publication.setDealer(dealer); publication.setPartnership(partnership);
        publication.setStatus(ProductPublicationStatusEnum.APPROVED); publication.setActive(true);
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                20L, 30L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(publication));

        MarketplaceChatbotResponse response = service.answer(
                new MarketplaceChatbotRequest("Quels produits sont disponibles ?", 30L, null), tenantRequest());

        assertThat(response.reply()).contains("Smartphone Horizon", "1 800 DT", "Disponible");
    }

    @Test
    void returnsPriceDealerDescriptionAndCharacteristicsForADetailQuestion() {
        ProductPublicationRequest publication = publishedDealerProduct(
                "Smartphone Horizon", "Un smartphone 5G avec écran AMOLED", "1800", 8,
                specification("RAM", "8 Go"), specification("Batterie", "5000 mAh"));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                20L, 30L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(publication));

        MarketplaceChatbotResponse response = service.answer(
                new MarketplaceChatbotRequest("Donne-moi la fiche détaillée du Smartphone Horizon", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_DETAILS");
        assertThat(response.reply()).contains("Détails de Smartphone Horizon", "1 800 DT", "Mobile Partner",
                        "Description : Un smartphone 5G avec écran AMOLED", "RAM : 8 Go", "Batterie : 5000 mAh")
                .doesNotContain("8 unité(s)", "Disponibilité", "Stock");
    }

    @Test
    void answersOnlyWithThePriceWhenTheQuestionIsAboutPrice() {
        ProductPublicationRequest publication = publishedDealerProduct(
                "Smartphone Horizon", "Un smartphone 5G avec écran AMOLED", "1800", 8,
                specification("RAM", "8 Go"));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                20L, 30L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(publication));

        MarketplaceChatbotResponse response = service.answer(
                new MarketplaceChatbotRequest("Quel est le prix du Smartphone Horizon ?", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_PRICE");
        assertThat(response.reply()).isEqualTo("Smartphone Horizon : 1 800 DT.");
    }

    @Test
    void dynamicallyComparesTheTwoNamedProductsAmongSeveralResults() {
        Module comparator = new Module(); comparator.setName("comparateur");
        MarketplaceStoreModule assignment = new MarketplaceStoreModule();
        assignment.setModule(comparator); assignment.setEnabled(true); assignment.setVisible(true);
        marketplaceStore.setMarketplaceStoreModules(List.of(assignment));
        ProductPublicationRequest samsung = publishedDealerProduct(
                "Samsung Galaxy S23", "Téléphone premium", "2500", 4,
                specification("RAM", "8 Go"), specification("Batterie", "3900 mAh"));
        ProductPublicationRequest xiaomi = publishedDealerProduct(
                "Xiaomi Redmi Note 13 Pro", "Téléphone performant", "1800", 9,
                specification("RAM", "12 Go"), specification("Batterie", "5000 mAh"));
        ProductPublicationRequest infinix = publishedDealerProduct(
                "Infinix Note 30", "Téléphone accessible", "1000", 6,
                specification("RAM", "8 Go"));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                20L, 30L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(samsung, xiaomi, infinix));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest(
                "Compare Samsung Galaxy S23 et Xiaomi Redmi Note 13 Pro", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_COMPARISON");
        assertThat(response.reply()).contains("Samsung Galaxy S23", "Xiaomi Redmi Note 13 Pro", "RAM", "Batterie", "700 DT")
                .doesNotContain("Infinix Note 30");
    }

    @Test
    void simulatesUsingTheSelectedProductPriceAndAppliesTheMinimumContribution() {
        Module simulatorModule = new Module(); simulatorModule.setName("simulateur");
        MarketplaceStoreModule publicAssignment = new MarketplaceStoreModule();
        publicAssignment.setModule(simulatorModule); publicAssignment.setEnabled(true); publicAssignment.setVisible(true);
        marketplaceStore.setMarketplaceStoreModules(List.of(publicAssignment));
        ModuleStore simulator = new ModuleStore();
        simulator.setModule(simulatorModule); simulator.setActif(true);
        simulator.setParameters(List.of(parameter("tauxInteret", "10"), parameter("apportMinPourcentage", "20"),
                parameter("dureeMin", "12"), parameter("dureeMax", "60"), parameter("fraisDossierMontant", "100")));
        when(moduleStoreRepository.findByStoreIdAndActifTrueOrderByOrdreAsc(30L)).thenReturn(List.of(simulator));
        ProductPublicationRequest publication = publishedDealerProduct(
                "Smartphone Horizon", "Téléphone 5G", "1800", 8, specification("RAM", "8 Go"));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                20L, 30L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(publication));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest(
                "Simule Smartphone Horizon sur 24 mois avec un apport de 100 DT", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("SIMULATION");
        assertThat(response.reply()).contains("Smartphone Horizon", "1 800 DT", "24 mois", "360 DT",
                "apport minimum", "mensualité estimée");
    }

    @Test
    void understandsTheLegacyFrenchSimulatorParameterNamesUsedByTheStores() {
        Module simulatorModule = new Module(); simulatorModule.setName("simulateur");
        MarketplaceStoreModule publicAssignment = new MarketplaceStoreModule();
        publicAssignment.setModule(simulatorModule); publicAssignment.setEnabled(true); publicAssignment.setVisible(true);
        marketplaceStore.setMarketplaceStoreModules(List.of(publicAssignment));
        ModuleStore simulator = new ModuleStore(); simulator.setModule(simulatorModule); simulator.setActif(true);
        simulator.setParameters(List.of(
                namedParameter("taux", "Taux d’intérêt", "10"),
                namedParameter("Pourcentage", "Apport min propre", "499"),
                namedParameter("duree", "Durée min de Remboursement", "3"),
                namedParameter("Durée", "Durée max de Remboursement", "10"),
                namedParameter("Pourcentage", "Frais de dossier", "1")));
        when(moduleStoreRepository.findByStoreIdAndActifTrueOrderByOrdreAsc(30L)).thenReturn(List.of(simulator));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest(
                "simulation de 2 000 DT sur 6 mois", 30L, null), tenantRequest());

        assertThat(response.reply()).contains("2 000 DT", "6 mois", "apport 499 DT", "mensualité estimée");
    }

    @Test
    void remembersTheListedProductsForAProductDetailFollowUp() {
        Product first = new Product();
        first.setName("Telephone Alpha"); first.setDescription("Le modèle économique");
        first.setPrice(new BigDecimal("900")); first.setStore(marketplaceStore.getStore());
        first.setParameterValues(List.of());
        Product second = new Product();
        second.setName("Telephone Beta"); second.setDescription("Le modèle premium");
        second.setPrice(new BigDecimal("1500")); second.setStore(marketplaceStore.getStore());
        second.setParameterValues(List.of());
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(second, first));

        service.answer(new MarketplaceChatbotRequest("Liste les produits disponibles", 30L, "conversation-123"), tenantRequest());
        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest(
                "Donne les détails du premier", 30L, "conversation-123"), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_DETAILS");
        assertThat(response.reply()).contains("Telephone Alpha", "900 DT", "Description : Le modèle économique",
                        "Aucune caractéristique détaillée")
                .doesNotContain("Telephone Beta", "Stock", "Disponibilité");
    }

    @Test
    void estimatesAMonthlyPaymentFromTheConfiguredSimulatorParameters() {
        Module module = new Module(); module.setId(1L); module.setName("simulateur");
        MarketplaceStoreModule publicAssignment = new MarketplaceStoreModule();
        publicAssignment.setModule(module); publicAssignment.setEnabled(true); publicAssignment.setVisible(true);
        marketplaceStore.setMarketplaceStoreModules(List.of(publicAssignment));

        ModuleStore simulator = new ModuleStore();
        simulator.setModule(module); simulator.setActif(true);
        simulator.setParameters(List.of(parameter("tauxInteret", "10"), parameter("apportMinPourcentage", "20"),
                parameter("dureeMin", "12"), parameter("dureeMax", "60"), parameter("fraisDossierMontant", "100")));
        when(moduleStoreRepository.findByStoreIdAndActifTrueOrderByOrdreAsc(30L)).thenReturn(List.of(simulator));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("simulation de 20 000 DT sur 36 mois", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("SIMULATION");
        assertThat(response.reply()).contains("20", "36 mois", "mensualité estimée", "Frais de dossier");
    }

    private ModuleStoreParameter parameter(String code, String value) {
        ModuleStoreParameter parameter = new ModuleStoreParameter();
        parameter.setCode(code); parameter.setValue(value);
        return parameter;
    }

    private ModuleStoreParameter namedParameter(String code, String name, String value) {
        ModuleStoreParameter parameter = parameter(code, value);
        parameter.setName(name);
        return parameter;
    }

    private ProductPublicationRequest publishedDealerProduct(
            String name, String description, String price, int stock, DealerProductParameterValue... values) {
        Dealer dealer = new Dealer();
        dealer.setId(50L); dealer.setCompanyName("Mobile Partner"); dealer.setStatus(DealerStatusEnum.ACTIVE);
        DealerProduct product = new DealerProduct();
        product.setId((long) Math.abs(name.hashCode())); product.setDealer(dealer); product.setStore(marketplaceStore.getStore());
        product.setName(name); product.setDescription(description); product.setPrice(new BigDecimal(price));
        product.setAvailableStock(stock); product.setStatus(DealerProductStatusEnum.ACTIVE);
        product.setParameterValues(List.of(values));
        for (DealerProductParameterValue value : values) value.setProduct(product);
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(product.getId() + 100L); partnership.setStatus(DealerPartnershipStatusEnum.ACTIVE);
        ProductPublicationRequest publication = new ProductPublicationRequest();
        publication.setProduct(product); publication.setDealer(dealer); publication.setPartnership(partnership);
        publication.setStatus(ProductPublicationStatusEnum.APPROVED); publication.setActive(true);
        return publication;
    }

    private DealerProductParameterValue specification(String name, String value) {
        ProductParameterDefinition definition = new ProductParameterDefinition();
        definition.setName(name); definition.setStore(marketplaceStore.getStore());
        DealerProductParameterValue parameterValue = new DealerProductParameterValue();
        parameterValue.setParameterDefinition(definition); parameterValue.setValue(value);
        return parameterValue;
    }

    private MockHttpServletRequest tenantRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("banque-test.lvh.me");
        return request;
    }
}
