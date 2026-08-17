ALTER TABLE dealer_bank_partnership
    ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(20),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE dealer_bank_partnership
SET initiated_by = 'DEALER'
WHERE initiated_by IS NULL;

ALTER TABLE dealer_bank_partnership
    ALTER COLUMN initiated_by SET NOT NULL;

ALTER TABLE dealer_bank_partnership
    DROP CONSTRAINT IF EXISTS dealer_bank_partnership_status_check;

ALTER TABLE dealer_bank_partnership
    ADD CONSTRAINT dealer_bank_partnership_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'WAITING_CONTRACT', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'TERMINATED'));

ALTER TABLE dealer_bank_partnership
    DROP CONSTRAINT IF EXISTS dealer_bank_partnership_initiated_by_check;

ALTER TABLE dealer_bank_partnership
    ADD CONSTRAINT dealer_bank_partnership_initiated_by_check
    CHECK (initiated_by IN ('DEALER', 'BANK'));
