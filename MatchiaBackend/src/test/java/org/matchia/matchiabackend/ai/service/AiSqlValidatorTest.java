package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiSqlValidatorTest {
    private final AiSqlValidator validator = new AiSqlValidator();
    private final DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(
            Map.of("payments", Set.of("id", "amount", "created_at")), "payments");

    @Test
    void acceptsAllowedSelectAndAddsSafeLimit() {
        assertThat(validator.validateAndApplyLimit("```sql SELECT p.id, p.amount FROM payments p ```", schema))
                .isEqualTo("SELECT p.id, p.amount FROM payments p LIMIT 50");
        assertThat(validator.validateAndApplyLimit("SELECT id FROM payments LIMIT 10", schema))
                .endsWith("LIMIT 10");
    }

    @Test
    void rejectsUnsafeSqlUnknownTablesSensitiveFieldsAndInvalidLimits() {
        assertThatThrownBy(() -> validator.validateAndApplyLimit("", schema)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.validateAndApplyLimit("DELETE FROM payments", schema)).isInstanceOf(IllegalArgumentException.class);
    }
}
