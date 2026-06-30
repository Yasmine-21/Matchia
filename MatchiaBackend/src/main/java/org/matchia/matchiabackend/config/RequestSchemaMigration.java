package org.matchia.matchiabackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void dropMarketplaceSlugUniqueConstraint() {
        try {
            List<String> constraints = jdbcTemplate.queryForList(
                    """
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    JOIN unnest(con.conkey) AS key(attnum) ON true
                    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = key.attnum
                    WHERE nsp.nspname = 'public'
                      AND rel.relname = 'request'
                      AND att.attname = 'marketplace_slug'
                      AND con.contype = 'u'
                    """,
                    String.class
            );

            for (String constraint : constraints) {
                jdbcTemplate.execute("ALTER TABLE public.request DROP CONSTRAINT IF EXISTS " + constraint);
                log.info("Dropped legacy unique constraint '{}' on request.marketplace_slug", constraint);
            }
        } catch (Exception error) {
            log.warn("Could not clean legacy request marketplace slug constraint: {}", error.getMessage());
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void widenRequestModuleSelectionParametersColumn() {
        try {
            jdbcTemplate.execute("""
                    ALTER TABLE public.request_module_selection
                    ALTER COLUMN parameters TYPE TEXT
                    """);
            log.info("Ensured request_module_selection.parameters uses TEXT for large module parameter payloads");
        } catch (Exception error) {
            log.warn("Could not widen request_module_selection.parameters column: {}", error.getMessage());
        }
    }
}
