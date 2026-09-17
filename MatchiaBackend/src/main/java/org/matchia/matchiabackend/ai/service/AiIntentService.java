package org.matchia.matchiabackend.ai.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Adds neutral question hints; table selection always comes from the dynamic schema and Gemini. */
@Service
public class AiIntentService {

    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{2}/\\d{2}/\\d{4})\\b");
    private static final Pattern LIMIT_PATTERN = Pattern.compile("\\b(\\d+)\\s+(?:plus\\s+recent|recent|latest|last)", Pattern.CASE_INSENSITIVE);
    private static final Pattern UPCOMING_DAYS_PATTERN = Pattern.compile(
            "\\b(?:dans\\s+les?\\s+)?(\\d+)\\s+(?:(?:prochains?|prochaines?)\\s+)?jours?\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NEXT_DAYS_PATTERN = Pattern.compile(
            "\\b(?:next\\s+)?(\\d+)\\s+days?\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern CONFIDENTIAL_CREDENTIAL_PATTERN = Pattern.compile(
            "\\b(?:mots? de passe|passwords?|mdp|codes? pin|pin|otp|tokens?|"
                    + "jetons? d acces|cles? api|api keys?|cles? secretes?|private keys?|"
                    + "secrets?|credentials?|identifiants? de connexion|codes? de verification|jwt)\\b"
    );
    private static final Set<String> AGGREGATION_WORDS = Set.of("combien", "nombre", "total", "somme", "moyenne", "average", "count");
    private static final Set<String> GREETING_MESSAGES = Set.of(
            "bonjour", "salut", "bonsoir", "hello", "hi", "coucou",
            "bonjour assistant", "salut assistant", "bonjour matchia"
    );

    /** Refuses credential requests locally, before any schema, database, or model access. */
    public String confidentialRequestReply(String question) {
        String normalized = normalizeConversation(question);
        if (!CONFIDENTIAL_CREDENTIAL_PATTERN.matcher(normalized).find()) {
            return null;
        }
        return "Je ne peux pas répondre, les données sont confidentielles.";
    }

    /**
     * Returns a local conversational answer only when the message contains no business-data intent.
     * This prevents greetings and help requests from being converted into database queries.
     */
    public String conversationalReply(String question) {
        String normalized = normalizeConversation(question);
        if (normalized.isBlank() || detectIntent(normalized) != Intent.GENERAL) {
            return null;
        }

        if (GREETING_MESSAGES.contains(normalized)
                || normalized.matches("^(bonjour|salut|bonsoir|hello|hi|coucou) (comment vas tu|ca va)$")) {
            return "Bonjour, comment puis-je vous aider ?";
        }

        boolean asksForHelp = normalized.matches("^(bonjour )?(tu |vous )?(peux|pouvez|pourrais|pourriez) "
                        + "(tu |vous )?(m |me |nous )?aider( s il (te|vous) plait)?$")
                || normalized.matches("^(bonjour )?comment (peux tu|pouvez vous) (m |me |nous )?aider$")
                || normalized.matches("^(bonjour )?(que peux tu faire|que pouvez vous faire|aide moi|besoin d aide)$");
        if (asksForHelp) {
            return "Oui. Je peux vous aider à consulter les informations autorisées de Matchia, par exemple les banques, "
                    + "les marketplaces, les stores, les modules, les demandes, les paiements et les abonnements. "
                    + "Posez-moi une question précise, comme : « Combien de banques sont actives ? »";
        }

        if (normalized.matches("^(merci|merci beaucoup|je te remercie|je vous remercie)$")) {
            return "Avec plaisir ! Je reste disponible si vous avez une autre question sur Matchia.";
        }

        if (normalized.matches("^(qui es tu|qui etes vous|presente toi)$")) {
            return "Je suis Matchia AI Assistant, l’assistant du back-office SaaS. Je réponds aux questions sur les informations autorisées de la plateforme.";
        }
        return null;
    }

    public Analysis analyze(String question) {
        String original = question == null ? "" : question.trim();
        String normalized = normalize(original);
        return new Analysis(
                detectIntent(normalized),
                extractDates(original),
                extractLimit(normalized),
                containsAny(normalized, AGGREGATION_WORDS),
                containsAny(normalized, Set.of("recent", "derniere", "dernieres", "latest", "last")),
                extractUpcomingDays(normalized)
        );
    }

    private Intent detectIntent(String question) {
        if (containsAny(question, Set.of("abonnement", "subscription", "expiration", "expire", "renouvellement"))) return Intent.SUBSCRIPTIONS;
        if (containsAny(question, Set.of("paiement", "payment", "paid"))) return Intent.PAYMENTS;
        if (containsAny(question, Set.of("demande", "request", "join"))) return Intent.REQUESTS;
        if (containsAny(question, Set.of("notification", "alert"))) return Intent.NOTIFICATIONS;
        if (containsAny(question, Set.of("marketplace", "marketplaces", "place de marche", "place de marché"))) return Intent.MARKETPLACES;
        if (containsAny(question, Set.of("store", "boutique"))) return Intent.STORES;
        if (containsAny(question, Set.of("module"))) return Intent.MODULES;
        if (containsAny(question, Set.of("banque", "bank"))) return Intent.BANKS;
        return Intent.GENERAL;
    }

    private List<String> extractDates(String question) {
        Matcher matcher = DATE_PATTERN.matcher(question);
        Set<String> dates = new LinkedHashSet<>();
        while (matcher.find()) dates.add(matcher.group(1));
        return new ArrayList<>(dates);
    }

    private Integer extractLimit(String question) {
        Matcher matcher = LIMIT_PATTERN.matcher(question);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : null;
    }

    private Integer extractUpcomingDays(String question) {
        Matcher frenchMatcher = UPCOMING_DAYS_PATTERN.matcher(question);
        Matcher englishMatcher = NEXT_DAYS_PATTERN.matcher(question);
        Matcher matched = frenchMatcher.find() ? frenchMatcher : englishMatcher.find() ? englishMatcher : null;
        if (matched == null) {
            return null;
        }
        int days = Integer.parseInt(matched.group(1));
        return days > 0 && days <= 365 ? days : null;
    }

    private boolean containsAny(String value, Set<String> tokens) {
        return tokens.stream().anyMatch(value::contains);
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeConversation(String value) {
        return normalize(value == null ? "" : value)
                .replaceAll("['’_-]", " ")
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public enum Intent { BANKS, MARKETPLACES, STORES, MODULES, SUBSCRIPTIONS, PAYMENTS, REQUESTS, NOTIFICATIONS, GENERAL }

    public record Analysis(Intent intent, List<String> dates, Integer limit, boolean aggregationRequested,
                           boolean recentRequest, Integer upcomingDays) {
        public String buildSqlGuidance() {
            StringBuilder guidance = new StringBuilder("Use the dynamic schema as the source of truth; do not assume a table or column exists. ");
            if (!dates.isEmpty()) {
                guidance.append("Dates supplied in dd/MM/yyyy: ").append(String.join(", ", dates))
                        .append(". Use TO_DATE for comparisons. ");
            }
            if (aggregationRequested) guidance.append("Use an explicit aggregate, normally COUNT(*), SUM, or AVG. ");
            if (recentRequest) guidance.append("Order by the relevant date descending. ");
            if (limit != null && limit > 0) guidance.append("Requested row count: ").append(Math.min(limit, 50)).append(". ");
            if (upcomingDays != null) {
                guidance.append("For an upcoming expiration window, include dates from CURRENT_DATE through CURRENT_DATE + ")
                        .append(upcomingDays).append(" days, inclusive. ");
            }
            guidance.append("Do not add status, role, enabled, visible, or other filters unless the administrator explicitly requested them.");
            return guidance.toString();
        }
    }
}
