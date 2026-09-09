package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartnershipContractLegacyInitializer implements ApplicationRunner {
    private final PartnershipContractService contractService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE dealer_bank_partnership DROP CONSTRAINT IF EXISTS dealer_bank_partnership_status_check");
        jdbcTemplate.execute("ALTER TABLE dealer_bank_partnership ADD CONSTRAINT dealer_bank_partnership_status_check "
                + "CHECK (status IN ('PENDING','APPROVED','WAITING_CONTRACT','ACTIVE','REJECTED','SUSPENDED','TERMINATED'))");
        jdbcTemplate.execute("UPDATE dealer_bank_partnership SET initiated_by = 'DEALER' WHERE initiated_by IS NULL");
        jdbcTemplate.execute("""
                DO $$ DECLARE old_constraint text; BEGIN
                  SELECT conname INTO old_constraint FROM pg_constraint
                  WHERE conrelid = 'partnership_contract'::regclass AND contype = 'u'
                    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'partnership_contract'::regclass AND attname = 'partnership_id')];
                  IF old_constraint IS NOT NULL THEN EXECUTE format('ALTER TABLE partnership_contract DROP CONSTRAINT %I', old_constraint); END IF;
                END $$;
                """);
        contractService.migrateLegacyApprovedPartnerships();
    }
}
