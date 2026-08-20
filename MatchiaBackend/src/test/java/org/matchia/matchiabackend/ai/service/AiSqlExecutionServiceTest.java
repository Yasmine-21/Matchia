package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AiSqlExecutionServiceTest {
    @Test
    void returnsSafeJsonHidingTechnicalIdsAndTruncatingValues() {
        NamedParameterJdbcTemplate named = mock(NamedParameterJdbcTemplate.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AiSqlValidator validator = mock(AiSqlValidator.class);
        AiSqlExecutionService service = new AiSqlExecutionService(named, validator);
        DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(Map.of("payment", java.util.Set.of("amount")), "schema");
        when(validator.validateAndApplyLimit("select", schema)).thenReturn("select LIMIT 50");
        when(named.getJdbcTemplate()).thenReturn(jdbc);
        when(jdbc.queryForList("select LIMIT 50")).thenReturn(List.of(Map.of(
                "id", 4L, "bankId", 9L, "label", "x".repeat(510), "amount", 12)));

        AiSqlExecutionService.QueryResult result = service.execute("select", schema);

        assertThat(result.rowCount()).isEqualTo(1);
        assertThat(result.validatedSql()).isEqualTo("select LIMIT 50");
        assertThat(result.resultJson()).contains("amount", "...", "label").doesNotContain("bankId");
        assertThat(result.isEmpty()).isFalse();
        assertThat(new AiSqlExecutionService.QueryResult("[]", 0, "sql").isEmpty()).isTrue();
    }

    @Test
    void wrapsDatabaseFailuresWithValidatedSql() {
        NamedParameterJdbcTemplate named = mock(NamedParameterJdbcTemplate.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AiSqlValidator validator = mock(AiSqlValidator.class);
        AiSqlExecutionService service = new AiSqlExecutionService(named, validator);
        DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(Map.of("payment", java.util.Set.of("amount")), "schema");
        when(validator.validateAndApplyLimit(anyString(), eq(schema))).thenReturn("safe sql");
        when(named.getJdbcTemplate()).thenReturn(jdbc);
        when(jdbc.queryForList("safe sql")).thenThrow(new DataAccessResourceFailureException("offline"));

        assertThatThrownBy(() -> service.execute("select", schema))
                .isInstanceOf(AiSqlExecutionService.AiSqlExecutionException.class)
                .hasMessageContaining("valid")
                .satisfies(error -> assertThat(((AiSqlExecutionService.AiSqlExecutionException) error).getSql()).isEqualTo("safe sql"));
    }
}
