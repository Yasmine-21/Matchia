package org.matchia.matchiabackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Idempotent compatibility migration for databases created before Subscription existed.
 * It preserves every payment and links payments to a subscription only when their
 * request already resolves to a marketplace.
 */
@Component
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class SubscriptionSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS subscription (
                    id BIGSERIAL PRIMARY KEY,
                    request_id BIGINT NOT NULL UNIQUE,
                    marketplace_id BIGINT NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    start_date DATE,
                    expiration_date DATE,
                    duration_months INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        jdbcTemplate.execute("ALTER TABLE payment ADD COLUMN IF NOT EXISTS subscription_id BIGINT");
        jdbcTemplate.execute("ALTER TABLE payment ADD COLUMN IF NOT EXISTS renewal_request_id BIGINT");
        jdbcTemplate.execute("ALTER TABLE request ADD COLUMN IF NOT EXISTS original_request_id BIGINT");
        jdbcTemplate.execute("ALTER TABLE request ADD COLUMN IF NOT EXISTS subscription_id BIGINT");
        jdbcTemplate.update("""
                UPDATE notifications notification
                SET recipient_id = app_user.bank_id
                FROM users app_user
                WHERE notification.recipient_id = app_user.id
                  AND app_user.bank_id IS NOT NULL
                """);
        jdbcTemplate.execute("""
                DO $$
                DECLARE constraint_name TEXT;
                BEGIN
                    -- Older databases can have a CHECK constraint that predates renewal requests.
                    FOR constraint_name IN
                        SELECT constraint_row.conname
                        FROM pg_constraint constraint_row
                        JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
                        JOIN pg_namespace namespace_row ON namespace_row.oid = table_row.relnamespace
                        WHERE namespace_row.nspname = 'public'
                          AND table_row.relname = 'request'
                          AND constraint_row.contype = 'c'
                          AND pg_get_constraintdef(constraint_row.oid) ILIKE '%request_type%'
                    LOOP
                        EXECUTE format('ALTER TABLE request DROP CONSTRAINT IF EXISTS %I', constraint_name);
                    END LOOP;

                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'request_type_allowed_values') THEN
                        ALTER TABLE request ADD CONSTRAINT request_type_allowed_values
                            CHECK (request_type IN ('join', 'store', 'module', 'subscription', 'renewal'));
                    END IF;
                END $$;
                """);
        jdbcTemplate.execute("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_request') THEN
                        ALTER TABLE subscription ADD CONSTRAINT fk_subscription_request
                            FOREIGN KEY (request_id) REFERENCES request(id);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_marketplace') THEN
                        ALTER TABLE subscription ADD CONSTRAINT fk_subscription_marketplace
                            FOREIGN KEY (marketplace_id) REFERENCES marketplace(id);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_subscription') THEN
                        ALTER TABLE payment ADD CONSTRAINT fk_payment_subscription
                            FOREIGN KEY (subscription_id) REFERENCES subscription(id);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_request_original_request') THEN
                        ALTER TABLE request ADD CONSTRAINT fk_request_original_request
                            FOREIGN KEY (original_request_id) REFERENCES request(id);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_request_subscription') THEN
                        ALTER TABLE request ADD CONSTRAINT fk_request_subscription
                            FOREIGN KEY (subscription_id) REFERENCES subscription(id);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_renewal_request') THEN
                        ALTER TABLE payment ADD CONSTRAINT fk_payment_renewal_request
                            FOREIGN KEY (renewal_request_id) REFERENCES request(id);
                    END IF;
                END $$;
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_payment_subscription_id ON payment(subscription_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_payment_renewal_request_id ON payment(renewal_request_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_request_subscription_id ON request(subscription_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_subscription_expiration_date ON subscription(expiration_date)");

        int createdSubscriptions = jdbcTemplate.update("""
                WITH latest_paid_payment AS (
                    SELECT DISTINCT ON (p.request_id)
                        p.request_id,
                        marketplace.id AS marketplace_id,
                        p.paid_at::date AS start_date,
                        (p.paid_at + INTERVAL '1 month')::date AS expiration_date
                    FROM payment p
                    JOIN request request_row ON request_row.id = p.request_id
                    JOIN marketplace ON marketplace.bank_id = request_row.bank_id
                    WHERE p.status = 'paid' AND p.paid_at IS NOT NULL
                    ORDER BY p.request_id, p.paid_at DESC, p.id DESC
                )
                INSERT INTO subscription (
                    request_id, marketplace_id, status, start_date, expiration_date,
                    duration_months, created_at, updated_at
                )
                SELECT request_id, marketplace_id,
                       CASE WHEN expiration_date < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END,
                       start_date, expiration_date, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM latest_paid_payment source
                WHERE NOT EXISTS (
                    SELECT 1 FROM subscription existing WHERE existing.request_id = source.request_id
                )
                """);

        int linkedPayments = jdbcTemplate.update("""
                UPDATE payment
                SET subscription_id = subscription.id
                FROM subscription
                WHERE payment.request_id = subscription.request_id
                  AND payment.subscription_id IS NULL
                """);
        log.info("Migration subscription terminee: {} abonnement(s) crees, {} paiement(s) rattaches.",
                createdSubscriptions, linkedPayments);
    }
}
