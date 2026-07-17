package org.matchia.matchiabackend.ai.service;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Validates model-generated SQL against the dynamically filtered schema before it reaches JDBC. */
@Component
public class AiSqlValidator {

    private static final int MAX_ROWS = 50;
    private static final Set<String> ALLOWED_FUNCTIONS = Set.of(
            "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "LOWER", "UPPER", "DATE",
            "DATE_TRUNC", "DATE_PART", "EXTRACT", "ROUND", "CAST", "TO_CHAR", "TO_DATE",
            "TO_TIMESTAMP", "CONCAT", "STRING_AGG", "ARRAY_AGG", "JSON_AGG", "JSONB_AGG",
            "BOOL_AND", "BOOL_OR", "AGE", "MAKE_INTERVAL", "LEFT", "RIGHT", "LENGTH", "TRIM",
            "NULLIF", "IN", "EXISTS", "FILTER", "OVER", "FLOOR", "CEIL", "GREATEST", "LEAST"
    );
    private static final Set<String> TABLE_CLAUSE_KEYWORDS = Set.of(
            "ON", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "FULL", "CROSS", "GROUP", "ORDER",
            "LIMIT", "OFFSET", "HAVING", "UNION", "FETCH"
    );
    private static final Pattern FORBIDDEN_OPERATION = Pattern.compile(
            "\\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE|MERGE|CALL|COPY|DO|INTO)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern LOCKING_CLAUSE = Pattern.compile(
            "\\bFOR\\s+(?:UPDATE|NO\\s+KEY\\s+UPDATE|SHARE|KEY\\s+SHARE)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern SENSITIVE_IDENTIFIER = Pattern.compile(
            "(?:password|token|secret|api_key|credential|otp|pin|session|checkout_url|stripe_session_id|"
                    + "stripe_payment_intent_id|reset|verification|phone|ip_address|user_agent|metadata|diff)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TABLE_REFERENCE = Pattern.compile(
            "\\b(?:FROM|JOIN)\\s+(\"?[A-Za-z_][A-Za-z0-9_]*\"?)(?:\\s+(?:AS\\s+)?([A-Za-z_][A-Za-z0-9_]*))?",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern QUALIFIED_COLUMN = Pattern.compile(
            "\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\.\\s*\"?([A-Za-z_][A-Za-z0-9_]*)\"?"
    );
    private static final Pattern FUNCTION_CALL = Pattern.compile("\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\(");
    private static final Pattern LIMIT = Pattern.compile("\\bLIMIT\\s+(\\d+)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern COUNT_STAR = Pattern.compile("\\bCOUNT\\s*\\(\\s*\\*\\s*\\)", Pattern.CASE_INSENSITIVE);

    public String validateAndApplyLimit(String generatedSql, DatabaseSchemaService.AllowedSchema allowedSchema) {
        String sql = stripCodeFenceAndFinalSemicolon(generatedSql);
        if (sql.isBlank()) {
            throw rejected();
        }

        String executableCode = stripStringLiterals(sql);
        String normalized = executableCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith("SELECT")
                || executableCode.contains(";")
                || executableCode.contains("--")
                || executableCode.contains("/*")
                || executableCode.contains("*/")
                || executableCode.toLowerCase(Locale.ROOT).contains("information_schema")
                || executableCode.toLowerCase(Locale.ROOT).contains("pg_catalog")
                || FORBIDDEN_OPERATION.matcher(executableCode).find()
                || LOCKING_CLAUSE.matcher(executableCode).find()
                || containsImplicitJoin(executableCode)
                || SENSITIVE_IDENTIFIER.matcher(executableCode).find()) {
            throw rejected();
        }

        Map<String, String> aliases = validateTables(executableCode, allowedSchema);
        validateColumns(executableCode, aliases, allowedSchema);
        validateFunctions(executableCode);
        if (COUNT_STAR.matcher(executableCode).replaceAll("").contains("*")) {
            throw rejected();
        }

        Matcher limitMatcher = LIMIT.matcher(executableCode);
        if (normalized.matches("(?s).*\\bLIMIT\\b.*") && !limitMatcher.find()) {
            throw rejected();
        }
        if (limitMatcher.find() && Integer.parseInt(limitMatcher.group(1)) > MAX_ROWS) {
            throw rejected();
        }
        return limitMatcher.reset().find() ? sql : sql + " LIMIT " + MAX_ROWS;
    }

    private Map<String, String> validateTables(String executableCode, DatabaseSchemaService.AllowedSchema allowedSchema) {
        Matcher matcher = TABLE_REFERENCE.matcher(executableCode);
        Map<String, String> aliases = new HashMap<>();
        while (matcher.find()) {
            String table = unquote(matcher.group(1)).toLowerCase(Locale.ROOT);
            if (!allowedSchema.tables().containsKey(table)) {
                throw rejected();
            }
            aliases.put(table, table);
            String alias = matcher.group(2);
            if (alias != null && !TABLE_CLAUSE_KEYWORDS.contains(alias.toUpperCase(Locale.ROOT))) {
                aliases.put(alias.toLowerCase(Locale.ROOT), table);
            }
        }
        if (aliases.isEmpty()) {
            throw rejected();
        }
        return aliases;
    }

    private void validateColumns(
            String executableCode,
            Map<String, String> aliases,
            DatabaseSchemaService.AllowedSchema allowedSchema
    ) {
        Matcher matcher = QUALIFIED_COLUMN.matcher(executableCode);
        while (matcher.find()) {
            String alias = matcher.group(1).toLowerCase(Locale.ROOT);
            String column = matcher.group(2).toLowerCase(Locale.ROOT);
            String table = aliases.get(alias);
            if (table == null || allowedSchema.isSensitiveName(column) || !allowedSchema.tables().get(table).contains(column)) {
                throw rejected();
            }
        }

    }

    private void validateFunctions(String executableCode) {
        Matcher matcher = FUNCTION_CALL.matcher(executableCode);
        while (matcher.find()) {
            if (!ALLOWED_FUNCTIONS.contains(matcher.group(1).toUpperCase(Locale.ROOT))) {
                throw rejected();
            }
        }
    }

    /**
     * Comma joins make it possible to introduce a table without a FROM/JOIN table reference.
     * Only explicit JOIN syntax is accepted so every table is checked against the allowlist.
     */
    private boolean containsImplicitJoin(String executableCode) {
        for (int index = 0; index < executableCode.length(); index++) {
            if (!startsWithWord(executableCode, index, "FROM")) {
                continue;
            }

            int fromDepth = parenthesesDepthAt(executableCode, index);
            for (int cursor = index + 4; cursor < executableCode.length(); cursor++) {
                int depth = parenthesesDepthAt(executableCode, cursor);
                if (depth < fromDepth) {
                    break;
                }
                if (depth == fromDepth && executableCode.charAt(cursor) == ',') {
                    return true;
                }
                if (depth == fromDepth && startsWithClauseWord(executableCode, cursor)) {
                    break;
                }
            }
        }
        return false;
    }

    private int parenthesesDepthAt(String value, int endExclusive) {
        int depth = 0;
        for (int index = 0; index < endExclusive; index++) {
            if (value.charAt(index) == '(') {
                depth++;
            } else if (value.charAt(index) == ')') {
                depth--;
            }
        }
        return depth;
    }

    private boolean startsWithClauseWord(String sql, int index) {
        return startsWithWord(sql, index, "WHERE")
                || startsWithWord(sql, index, "GROUP")
                || startsWithWord(sql, index, "ORDER")
                || startsWithWord(sql, index, "HAVING")
                || startsWithWord(sql, index, "LIMIT")
                || startsWithWord(sql, index, "OFFSET")
                || startsWithWord(sql, index, "UNION")
                || startsWithWord(sql, index, "FETCH")
                || startsWithWord(sql, index, "FOR");
    }

    private boolean startsWithWord(String value, int index, String word) {
        int end = index + word.length();
        if (index < 0 || end > value.length() || !value.regionMatches(true, index, word, 0, word.length())) {
            return false;
        }
        return (index == 0 || !isIdentifierCharacter(value.charAt(index - 1)))
                && (end == value.length() || !isIdentifierCharacter(value.charAt(end)));
    }

    private boolean isIdentifierCharacter(char character) {
        return Character.isLetterOrDigit(character) || character == '_';
    }

    private String stripCodeFenceAndFinalSemicolon(String value) {
        if (value == null) {
            return "";
        }
        String sql = value.trim()
                .replaceFirst("(?is)^```(?:sql)?\\s*", "")
                .replaceFirst("(?is)\\s*```$", "")
                .trim();
        return sql.endsWith(";") ? sql.substring(0, sql.length() - 1).trim() : sql;
    }

    /** Replaces literal contents so keyword checks operate on SQL syntax, not search values. */
    private String stripStringLiterals(String sql) {
        StringBuilder result = new StringBuilder(sql.length());
        boolean inLiteral = false;
        for (int index = 0; index < sql.length(); index++) {
            char character = sql.charAt(index);
            if (character == '\'') {
                result.append(character);
                if (inLiteral && index + 1 < sql.length() && sql.charAt(index + 1) == '\'') {
                    result.append('\'');
                    index++;
                    continue;
                }
                inLiteral = !inLiteral;
            } else {
                result.append(inLiteral ? ' ' : character);
            }
        }
        return inLiteral ? "" : result.toString();
    }

    private String unquote(String identifier) {
        return identifier.replace("\"", "");
    }

    private IllegalArgumentException rejected() {
        return new IllegalArgumentException("La requête générée n'est pas autorisée.");
    }
}
