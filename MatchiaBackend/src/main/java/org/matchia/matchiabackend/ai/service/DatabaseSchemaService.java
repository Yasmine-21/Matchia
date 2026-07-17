package org.matchia.matchiabackend.ai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Builds the model's database contract from the real public PostgreSQL schema. */
@Service
@RequiredArgsConstructor
public class DatabaseSchemaService {

    private static final Set<String> FORBIDDEN_NAME_PARTS = Set.of(
            "password", "token", "secret", "api_key", "credential", "otp", "pin", "session",
            "checkout_url", "stripe_session_id", "stripe_payment_intent_id", "reset", "verification",
            "phone", "ip_address", "user_agent", "metadata", "diff"
    );
    private static final Set<String> FORBIDDEN_TABLES = Set.of(
            "flyway_schema_history", "databasechangelog", "databasechangeloglock"
    );
    private static final String SCHEMA_SQL = """
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
            """;
    private static final String FOREIGN_KEY_SQL = """
            SELECT tc.table_name AS source_table,
                   kcu.column_name AS source_column,
                   ccu.table_name AS target_table,
                   ccu.column_name AS target_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name, kcu.ordinal_position
            """;

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AllowedSchema loadAllowedSchema() {
        Map<String, Set<String>> tables = new LinkedHashMap<>();
        Map<String, Map<String, String>> columnTypes = new LinkedHashMap<>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(SCHEMA_SQL);
        for (Map<String, Object> row : rows) {
            String table = stringValue(row, "table_name");
            String column = stringValue(row, "column_name");
            if (table == null || column == null || isForbiddenTable(table) || isSensitiveName(column)) {
                continue;
            }
            tables.computeIfAbsent(table, ignored -> new LinkedHashSet<>()).add(column);
            columnTypes.computeIfAbsent(table, ignored -> new LinkedHashMap<>())
                    .put(column, stringValue(row, "data_type"));
        }

        tables.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        columnTypes.keySet().retainAll(tables.keySet());
        if (tables.isEmpty()) {
            throw new IllegalStateException("Le schéma autorisé de l'assistant est vide.");
        }
        return new AllowedSchema(tables, buildSchemaText(tables, columnTypes, loadAllowedForeignKeys(tables)));
    }

    private String buildSchemaText(
            Map<String, Set<String>> tables,
            Map<String, Map<String, String>> columnTypes,
            List<ForeignKey> foreignKeys
    ) {
        StringBuilder schema = new StringBuilder("PostgreSQL schema available to the SaaS assistant:\n");
        tables.forEach((table, columns) -> schema.append(table)
                .append("(")
                .append(columns.stream()
                        .map(column -> column + " " + columnTypes.getOrDefault(table, Map.of()).getOrDefault(column, "unknown"))
                        .reduce((left, right) -> left + ", " + right)
                        .orElse(""))
                .append(")\n"));

        if (!foreignKeys.isEmpty()) {
            schema.append("\nVerified foreign-key relationships (use explicit JOIN conditions when relevant):\n");
            foreignKeys.forEach(foreignKey -> schema.append("- ")
                    .append(foreignKey.sourceTable()).append(".").append(foreignKey.sourceColumn())
                    .append(" -> ")
                    .append(foreignKey.targetTable()).append(".").append(foreignKey.targetColumn())
                    .append("\n"));
        }

        boolean hasSubscriptionTable = tables.keySet().stream()
                .anyMatch(table -> table.toLowerCase(Locale.ROOT).contains("subscription"));
        if (!hasSubscriptionTable && tables.containsKey("payment") && tables.get("payment").contains("paid_at")) {
            schema.append("\nSubscription business rule: subscriptions are paid payment records and expire one month after paid_at: ")
                    .append("paid_at + INTERVAL '1 month'.\n");
        }
        schema.append("\nUse only these public tables and columns. Never use SELECT *, system tables, information_schema, ")
                .append("or columns omitted from this schema. Email and full_name are allowed. ")
                .append("Always qualify columns with a table alias when joining tables.");
        return schema.toString();
    }

    private List<ForeignKey> loadAllowedForeignKeys(Map<String, Set<String>> tables) {
        return jdbcTemplate.queryForList(FOREIGN_KEY_SQL).stream()
                .map(row -> new ForeignKey(
                        stringValue(row, "source_table"),
                        stringValue(row, "source_column"),
                        stringValue(row, "target_table"),
                        stringValue(row, "target_column")
                ))
                .filter(foreignKey -> foreignKey.isAllowedBy(tables))
                .toList();
    }

    private boolean isForbiddenTable(String table) {
        String normalized = table.toLowerCase(Locale.ROOT);
        return FORBIDDEN_TABLES.contains(normalized) || normalized.startsWith("pg_") || isSensitiveName(normalized);
    }

    public boolean isSensitiveName(String identifier) {
        if (identifier == null) {
            return true;
        }
        String normalized = identifier.toLowerCase(Locale.ROOT);
        return FORBIDDEN_NAME_PARTS.stream().anyMatch(normalized::contains);
    }

    private String stringValue(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private record ForeignKey(String sourceTable, String sourceColumn, String targetTable, String targetColumn) {
        private boolean isAllowedBy(Map<String, Set<String>> tables) {
            return sourceTable != null && sourceColumn != null && targetTable != null && targetColumn != null
                    && tables.getOrDefault(sourceTable, Set.of()).contains(sourceColumn)
                    && tables.getOrDefault(targetTable, Set.of()).contains(targetColumn);
        }
    }

    public record AllowedSchema(Map<String, Set<String>> tables, String schemaText) {
        public AllowedSchema {
            Map<String, Set<String>> copy = new LinkedHashMap<>();
            tables.forEach((table, columns) -> copy.put(table, Collections.unmodifiableSet(new LinkedHashSet<>(columns))));
            tables = Collections.unmodifiableMap(copy);
        }

        public boolean isSensitiveName(String identifier) {
            if (identifier == null) {
                return true;
            }
            String normalized = identifier.toLowerCase(Locale.ROOT);
            return FORBIDDEN_NAME_PARTS.stream().anyMatch(normalized::contains);
        }
    }
}
