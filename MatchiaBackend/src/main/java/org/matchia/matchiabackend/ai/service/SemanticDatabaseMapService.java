package org.matchia.matchiabackend.ai.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Builds a schema-derived business map and ranks table paths without binding questions to fixed tables. */
@Service
public class SemanticDatabaseMapService {

    private static final int MAX_CANDIDATES = 5;
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final Pattern TABLE_REFERENCE = Pattern.compile(
            "\\b(?:FROM|JOIN)\\s+(\"?[A-Za-z_][A-Za-z0-9_]*\"?)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "au", "aux", "avec", "ce", "ces", "comment", "combien", "dans", "de", "des", "du",
            "en", "est", "et", "la", "le", "les", "ma", "mes", "mon", "pour", "par", "quel", "quelle",
            "quels", "quelles", "sur", "the", "and", "for", "from", "how", "many", "show", "what", "with"
    );
    /** Language equivalents are matched to dynamic identifiers; they never name a concrete database table. */
    private static final Map<String, Set<String>> TERM_EQUIVALENTS = Map.ofEntries(
            Map.entry("abonnement", Set.of("subscription")), Map.entry("paiement", Set.of("payment")),
            Map.entry("utilisateur", Set.of("user")), Map.entry("banque", Set.of("bank")),
            Map.entry("boutique", Set.of("store")), Map.entry("magasin", Set.of("store")),
            Map.entry("demande", Set.of("request")), Map.entry("produit", Set.of("product")),
            Map.entry("contenu", Set.of("content")), Map.entry("journal", Set.of("log")),
            Map.entry("marche", Set.of("marketplace")), Map.entry("notification", Set.of("notification"))
    );

    public SemanticMap analyze(String question, DatabaseSchemaService.AllowedSchema schema) {
        Set<String> terms = questionTerms(question);
        Map<String, Score> scores = new LinkedHashMap<>();
        schema.tables().forEach((table, columns) -> scores.put(table, score(table, columns, schema, terms)));

        schema.foreignKeys().forEach(foreignKey -> {
            Score source = scores.get(foreignKey.sourceTable());
            Score target = scores.get(foreignKey.targetTable());
            if (source != null && target != null) {
                if (source.points > 0) target.add(1, foreignKey.targetColumn() + " (relation)");
                if (target.points > 0) source.add(1, foreignKey.sourceColumn() + " (relation)");
            }
        });

        List<Candidate> candidates = scores.entrySet().stream()
                .filter(entry -> entry.getValue().points > 0)
                .sorted(Comparator.<Map.Entry<String, Score>>comparingInt(entry -> entry.getValue().points)
                        .reversed().thenComparing(Map.Entry::getKey))
                .limit(MAX_CANDIDATES)
                .map(entry -> new Candidate(entry.getKey(), entry.getValue().matchedParts))
                .toList();
        return new SemanticMap(schema, candidates);
    }

    private Score score(String table, Set<String> columns, DatabaseSchemaService.AllowedSchema schema, Set<String> terms) {
        Score score = new Score();
        Set<String> tableTerms = identifierTerms(table);
        for (String term : terms) {
            if (matches(term, tableTerms)) score.add(8, table);
            for (String column : columns) {
                if (matches(term, identifierTerms(column))) score.add(3, column);
                if (isDateTerm(term) && isTemporal(schema.columnType(table, column))) score.add(1, column + " (date)");
                if (isAggregateTerm(term) && isNumeric(schema.columnType(table, column))) score.add(1, column + " (numeric)");
            }
        }
        return score;
    }

    private Set<String> questionTerms(String question) {
        Set<String> terms = new LinkedHashSet<>();
        Matcher matcher = WORD.matcher(normalize(question));
        while (matcher.find()) {
            String term = matcher.group();
            if (term.length() > 1 && !STOP_WORDS.contains(term)) {
                Set<String> variants = variants(term);
                terms.addAll(variants);
                variants.forEach(variant -> terms.addAll(TERM_EQUIVALENTS.getOrDefault(variant, Set.of())));
            }
        }
        return terms;
    }

    private Set<String> identifierTerms(String value) {
        Set<String> terms = new LinkedHashSet<>();
        Matcher matcher = WORD.matcher(normalize(value.replaceAll("([a-z])([A-Z])", "$1 $2")));
        while (matcher.find()) terms.addAll(variants(matcher.group()));
        return terms;
    }

    private boolean matches(String term, Set<String> identifiers) {
        return identifiers.stream().anyMatch(identifier -> identifier.equals(term)
                || (term.length() >= 4 && identifier.length() >= 4 && (identifier.contains(term) || term.contains(identifier))));
    }

    private Set<String> variants(String value) {
        Set<String> values = new LinkedHashSet<>();
        values.add(value);
        if (value.endsWith("es") && value.length() > 4) values.add(value.substring(0, value.length() - 2));
        if (value.endsWith("s") && value.length() > 3) values.add(value.substring(0, value.length() - 1));
        return values;
    }

    private boolean isDateTerm(String term) {
        return Set.of("date", "recent", "derniere", "latest", "expiration", "expire", "jour", "mois", "annee").contains(term);
    }

    private boolean isAggregateTerm(String term) {
        return Set.of("combien", "nombre", "total", "somme", "moyenne", "average", "count").contains(term);
    }

    private static boolean isTemporal(String type) {
        return type != null && (type.contains("date") || type.contains("timestamp") || type.contains("time"));
    }

    private static boolean isNumeric(String type) {
        return type != null && (type.contains("int") || type.contains("numeric") || type.contains("decimal")
                || type.contains("double") || type.contains("real"));
    }

    private String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private static final class Score {
        private int points;
        private final Set<String> matchedParts = new LinkedHashSet<>();

        private void add(int score, String part) {
            points += score;
            matchedParts.add(part);
        }
    }

    public record Candidate(String table, Set<String> matchedParts) { }

    public record SemanticMap(DatabaseSchemaService.AllowedSchema schema, List<Candidate> candidates) {
        public String promptContext() {
            StringBuilder map = new StringBuilder("Semantic database map (derived from the live authorized schema):\n");
            schema.tables().forEach((table, columns) -> {
                List<DatabaseSchemaService.ForeignKey> relations = schema.foreignKeys().stream()
                        .filter(foreignKey -> foreignKey.sourceTable().equals(table) || foreignKey.targetTable().equals(table))
                        .toList();
                map.append("- ").append(table).append(": ")
                        .append(describeRole(table, relations.size()))
                        .append("; allowed columns: ")
                        .append(columns.stream().map(column -> column + " " + schema.columnType(table, column))
                                .reduce((left, right) -> left + ", " + right).orElse(""));
                if (!relations.isEmpty()) {
                    map.append("; verified relations: ");
                    map.append(relations.stream().map(foreignKey -> foreignKey.sourceTable() + "." + foreignKey.sourceColumn()
                                    + " -> " + foreignKey.targetTable() + "." + foreignKey.targetColumn())
                            .reduce((left, right) -> left + ", " + right).orElse(""));
                }
                map.append("; example capabilities: ").append(exampleCapabilities(columns, table, schema)).append(".\n");
            });
            appendOffersAndSubscriptionsRule(map, schema);
            map.append("Sensitive columns are omitted from this map and must never be queried or returned.");
            return map.toString();
        }

        /**
         * This is an authoritative business rule for the SaaS Offers & Subscriptions screen.
         * It is included only when its live source columns are available to the assistant.
         */
        private static void appendOffersAndSubscriptionsRule(
                StringBuilder map,
                DatabaseSchemaService.AllowedSchema schema
        ) {
            Set<String> paymentColumns = schema.tables().get("payment");
            if (paymentColumns == null || !paymentColumns.contains("status") || !paymentColumns.contains("paid_at")) {
                return;
            }

            map.append("\nAuthoritative Offers & Subscriptions business rule: this SaaS screen treats only payment rows ")
                    .append("with status 'paid' and a non-null paid_at as subscriptions. The payment status means that ")
                    .append("the payment succeeded; it never means that a subscription is expired. The expiration date is ")
                    .append("DATE(payment.paid_at + INTERVAL '1 month'). An expired subscription has expiration_date < CURRENT_DATE; ")
                    .append("an active subscription has expiration_date >= CURRENT_DATE; remaining days are ")
                    .append("DATE(payment.paid_at + INTERVAL '1 month') - CURRENT_DATE. Total subscriptions are the paid payment ")
                    .append("rows with a non-null paid_at. Use this rule for Offers & Subscriptions, expired-subscription, ")
                    .append("active-subscription, expiration-date, and remaining-days questions. Do not filter payment.status = 'expired'.\n");
        }

        public String initialGuidance() {
            if (candidates.isEmpty()) {
                return "No lexical candidate was found. Use the semantic map and complete live schema to infer the most relevant entity or relation path.";
            }
            return "Dynamic candidate tables: " + describe(candidates)
                    + ". Choose the best candidate or a verified relationship path; do not assume a fixed business table.";
        }

        public String alternativeGuidance(Set<String> usedTables) {
            List<Candidate> alternatives = candidates.stream().filter(candidate -> !usedTables.contains(candidate.table())).toList();
            if (alternatives.isEmpty()) {
                return candidates.isEmpty()
                        ? "Try a different plausible entity or verified relation path from the semantic map and do not repeat the previous path."
                        : null;
            }
            return "The previous query returned no rows and used " + String.join(", ", usedTables)
                    + ". Use at least one alternative candidate or verified relation path: " + describe(alternatives) + ".";
        }

        public Set<String> referencedTables(String sql) {
            Set<String> tables = new LinkedHashSet<>();
            Matcher matcher = TABLE_REFERENCE.matcher(sql == null ? "" : sql);
            while (matcher.find()) {
                String table = matcher.group(1).replace("\"", "").toLowerCase(Locale.ROOT);
                if (schema.tables().containsKey(table)) tables.add(table);
            }
            return tables;
        }

        public int retryBudget() {
            return Math.max(1, candidates.size());
        }

        private static String describeRole(String table, int relationCount) {
            return relationCount >= 2
                    ? "relation or assignment record connecting business entities"
                    : "business entity or event record identified by '" + table + "'";
        }

        private static String exampleCapabilities(Set<String> columns, String table, DatabaseSchemaService.AllowedSchema schema) {
            List<String> capabilities = new ArrayList<>();
            if (columns.stream().anyMatch(column -> isTextualName(column))) capabilities.add("text lookup");
            if (columns.stream().anyMatch(column -> isTemporal(schema.columnType(table, column)))) capabilities.add("date/recent listing");
            if (columns.stream().anyMatch(column -> isNumeric(schema.columnType(table, column)))) capabilities.add("count or numeric aggregate");
            if (columns.contains("status")) capabilities.add("explicit status filtering");
            return capabilities.isEmpty() ? "listing and relation lookup" : String.join(", ", capabilities);
        }

        private static boolean isTextualName(String column) {
            String lower = column.toLowerCase(Locale.ROOT);
            return lower.contains("name") || lower.contains("title") || lower.contains("label") || lower.contains("email") || lower.contains("slug");
        }

        private static String describe(List<Candidate> candidates) {
            return candidates.stream().map(candidate -> candidate.table() + " [" + String.join(", ", candidate.matchedParts()) + "]")
                    .reduce((left, right) -> left + "; " + right).orElse("");
        }
    }
}
