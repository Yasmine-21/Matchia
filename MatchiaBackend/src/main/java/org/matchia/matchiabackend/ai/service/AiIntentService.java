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
    private static final Set<String> AGGREGATION_WORDS = Set.of("combien", "nombre", "total", "somme", "moyenne", "average", "count");

    public Analysis analyze(String question) {
        String original = question == null ? "" : question.trim();
        String normalized = normalize(original);
        return new Analysis(
                detectIntent(normalized),
                extractDates(original),
                extractLimit(normalized),
                containsAny(normalized, AGGREGATION_WORDS),
                containsAny(normalized, Set.of("recent", "derniere", "dernieres", "latest", "last"))
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

    public enum Intent { BANKS, MARKETPLACES, STORES, MODULES, SUBSCRIPTIONS, PAYMENTS, REQUESTS, NOTIFICATIONS, GENERAL }

    public record Analysis(Intent intent, List<String> dates, Integer limit, boolean aggregationRequested, boolean recentRequest) {
        public String buildSqlGuidance() {
            StringBuilder guidance = new StringBuilder("Use the dynamic schema as the source of truth; do not assume a table or column exists. ");
            if (!dates.isEmpty()) {
                guidance.append("Dates supplied in dd/MM/yyyy: ").append(String.join(", ", dates))
                        .append(". Use TO_DATE for comparisons. ");
            }
            if (aggregationRequested) guidance.append("Use an explicit aggregate, normally COUNT(*), SUM, or AVG. ");
            if (recentRequest) guidance.append("Order by the relevant date descending. ");
            if (limit != null && limit > 0) guidance.append("Requested row count: ").append(Math.min(limit, 50)).append(". ");
            guidance.append("Do not add status, role, enabled, visible, or other filters unless the administrator explicitly requested them.");
            return guidance.toString();
        }
    }
}
