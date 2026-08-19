package org.matchia.matchiabackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Keeps financing-request optimistic locking compatible with rows created before
 * the version column was introduced. Hibernate cannot increment a null version.
 */
@Component
@Order(110)
@RequiredArgsConstructor
@Slf4j
public class FinancingRequestSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE financing_request ADD COLUMN IF NOT EXISTS version BIGINT");
        jdbcTemplate.execute("ALTER TABLE financing_request ADD COLUMN IF NOT EXISTS dealer_product_id BIGINT");
        jdbcTemplate.execute("ALTER TABLE financing_request ALTER COLUMN product_id DROP NOT NULL");
        int initializedRows = jdbcTemplate.update("UPDATE financing_request SET version = 0 WHERE version IS NULL");
        jdbcTemplate.execute("ALTER TABLE financing_request ALTER COLUMN version SET DEFAULT 0");
        jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_scope VARCHAR(20)");
        int clientDecisionNotifications = jdbcTemplate.update("""
                UPDATE notifications
                SET recipient_scope = 'USER'
                WHERE recipient_scope IS NULL
                  AND title IN ('Demande de financement accept\u00e9e', 'Demande de financement rejet\u00e9e')
                """);
        log.info("Financing request version migration completed: {} existing row(s) initialized.", initializedRows);
        log.info("Financing notification migration completed: {} client decision notification(s) classified.", clientDecisionNotifications);
    }
}
