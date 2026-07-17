package org.matchia.matchiabackend.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

/** Executes only SQL that has passed {@link AiSqlValidator}; it never accepts SQL from HTTP clients. */
@Service
@RequiredArgsConstructor
public class AiSqlExecutionService {

    private static final int MAX_VALUE_LENGTH = 500;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final AiSqlValidator validator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true, timeout = 15)
    public QueryResult execute(String generatedSql, DatabaseSchemaService.AllowedSchema allowedSchema) {
        String safeSql = validator.validateAndApplyLimit(generatedSql, allowedSchema);
        try {
            List<Map<String, Object>> rows = jdbcTemplate.getJdbcTemplate().queryForList(safeSql);
            return new QueryResult(toModelJson(rows), rows.size(), safeSql);
        } catch (DataAccessException exception) {
            throw new AiSqlExecutionException("La requête validée n'a pas pu être exécutée en base de données.", safeSql, exception);
        }
    }

    private String toModelJson(List<Map<String, Object>> rows) {
        List<Map<String, String>> safeRows = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, String> safeRow = new LinkedHashMap<>();
            row.forEach((column, value) -> {
                if (!isTechnicalIdentifier(column)) {
                    safeRow.put(column, truncate(value == null ? null : String.valueOf(value)));
                }
            });
            safeRows.add(safeRow);
        }
        try {
            return objectMapper.writeValueAsString(safeRows);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Impossible de préparer le résultat de la requête.", exception);
        }
    }

    private String truncate(String value) {
        if (value == null || value.length() <= MAX_VALUE_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_VALUE_LENGTH - 3) + "...";
    }

    private boolean isTechnicalIdentifier(String column) {
        if (column == null) {
            return false;
        }

        String trimmed = column.trim();
        if (trimmed.isEmpty()) {
            return false;
        }

        String lower = trimmed.toLowerCase(Locale.ROOT);
        if ("id".equals(lower) || lower.endsWith("_id") || lower.startsWith("id_")) {
            return true;
        }

        // Also hide common camelCase technical identifiers such as bankId, storeId, paymentId.
        return trimmed.endsWith("Id")
                && trimmed.length() > 2
                && Character.isLowerCase(trimmed.charAt(trimmed.length() - 3));
    }

    public record QueryResult(String resultJson, int rowCount, String validatedSql) {
        public boolean isEmpty() {
            return rowCount <= 0;
        }
    }

    public static class AiSqlExecutionException extends RuntimeException {
        private final String sql;

        public AiSqlExecutionException(String message, String sql, Throwable cause) {
            super(message, cause);
            this.sql = sql;
        }

        public String getSql() {
            return sql;
        }
    }
}
