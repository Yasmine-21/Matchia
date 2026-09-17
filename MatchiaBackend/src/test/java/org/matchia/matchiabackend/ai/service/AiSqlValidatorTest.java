package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
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

    @Test
    void acceptsUpcomingSubscriptionExpirationQuery() {
        DatabaseSchemaService.AllowedSchema subscriptionSchema = new DatabaseSchemaService.AllowedSchema(
                Map.of(
                        "subscription", Set.of("marketplace_id", "expiration_date"),
                        "marketplace", Set.of("id", "bank_id"),
                        "bank", Set.of("id", "name")
                ),
                Map.of(
                        "subscription", Map.of("marketplace_id", "bigint", "expiration_date", "date"),
                        "marketplace", Map.of("id", "bigint", "bank_id", "bigint"),
                        "bank", Map.of("id", "bigint", "name", "character varying")
                ),
                List.of(
                        new DatabaseSchemaService.ForeignKey("subscription", "marketplace_id", "marketplace", "id"),
                        new DatabaseSchemaService.ForeignKey("marketplace", "bank_id", "bank", "id")
                ),
                "subscription, marketplace, bank"
        );
        String sql = "SELECT b.name AS bank_name, s.expiration_date AS expiration_date, "
                + "(s.expiration_date - CURRENT_DATE) AS days_remaining FROM subscription s "
                + "JOIN marketplace m ON s.marketplace_id = m.id JOIN bank b ON m.bank_id = b.id "
                + "WHERE s.expiration_date >= CURRENT_DATE AND s.expiration_date <= CURRENT_DATE + 7 "
                + "ORDER BY s.expiration_date ASC LIMIT 50";

        assertThat(validator.validateAndApplyLimit(sql, subscriptionSchema)).isEqualTo(sql);
    }
}
