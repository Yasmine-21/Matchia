package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class DatabaseSchemaServiceTest {
    @Test
    void buildsAuthorizedSchemaAndFiltersSensitiveMetadata() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DatabaseSchemaService service = new DatabaseSchemaService(jdbc);
        when(jdbc.queryForList(anyString())).thenReturn(
                List.of(Map.of("table_name", "payment", "column_name", "id", "data_type", "bigint"),
                        Map.of("table_name", "payment", "column_name", "amount", "data_type", "numeric"),
                        Map.of("table_name", "user", "column_name", "password_hash", "data_type", "text"),
                        Map.of("table_name", "flyway_schema_history", "column_name", "version", "data_type", "text")),
                List.of(Map.of("source_table", "payment", "source_column", "id", "target_table", "payment", "target_column", "id")));

        DatabaseSchemaService.AllowedSchema schema = service.loadAllowedSchema();
        assertThat(schema.tables()).containsOnlyKeys("payment");
        assertThat(schema.tables().get("payment")).containsExactlyInAnyOrder("id", "amount");
        assertThat(schema.schemaText()).contains("payment(id bigint, amount numeric)", "Never use SELECT *");
        assertThat(service.isSensitiveName("password_hash")).isTrue();
        assertThat(service.isSensitiveName("email")).isFalse();
    }

    @Test
    void rejectsEmptyAuthorizedSchema() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString())).thenReturn(List.of(Map.of("table_name", "user", "column_name", "token", "data_type", "text")));
        assertThatThrownBy(() -> new DatabaseSchemaService(jdbc).loadAllowedSchema()).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void hidesDescriptionsForStoresModulesAndMarketplaces() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DatabaseSchemaService service = new DatabaseSchemaService(jdbc);
        when(jdbc.queryForList(anyString())).thenReturn(
                List.of(
                        Map.of("table_name", "store", "column_name", "name", "data_type", "character varying"),
                        Map.of("table_name", "store", "column_name", "description", "data_type", "character varying"),
                        Map.of("table_name", "module", "column_name", "name", "data_type", "character varying"),
                        Map.of("table_name", "module", "column_name", "description", "data_type", "character varying"),
                        Map.of("table_name", "marketplace", "column_name", "status", "data_type", "character varying"),
                        Map.of("table_name", "marketplace", "column_name", "description", "data_type", "character varying"),
                        Map.of("table_name", "request", "column_name", "marketplace_description", "data_type", "character varying"),
                        Map.of("table_name", "request_store_selection", "column_name", "store_description", "data_type", "character varying"),
                        Map.of("table_name", "request_module_selection", "column_name", "module_description", "data_type", "character varying")
                ),
                List.of()
        );

        DatabaseSchemaService.AllowedSchema schema = service.loadAllowedSchema();

        assertThat(schema.tables().get("store")).containsExactly("name");
        assertThat(schema.tables().get("module")).containsExactly("name");
        assertThat(schema.tables().get("marketplace")).containsExactly("status");
        assertThat(schema.tables()).doesNotContainKeys("request", "request_store_selection", "request_module_selection");
        assertThat(schema.schemaText()).doesNotContain("description");
    }
}
