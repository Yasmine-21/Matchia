-- FREE dealer-bank partnership contracts. No billing or payment table is involved.

ALTER TABLE dealer_bank_partnership DROP CONSTRAINT IF EXISTS dealer_bank_partnership_status_check;

CREATE TABLE IF NOT EXISTS partnership_contract (
    id BIGSERIAL PRIMARY KEY,
    contract_number VARCHAR(80) NOT NULL UNIQUE,
    partnership_id BIGINT NOT NULL UNIQUE REFERENCES dealer_bank_partnership(id),
    dealer_id BIGINT NOT NULL REFERENCES dealer(id),
    bank_id BIGINT NOT NULL REFERENCES bank(id),
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(40) NOT NULL,
    start_date DATE,
    end_date DATE,
    billing_model VARCHAR(20) NOT NULL DEFAULT 'FREE',
    commission_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    commission_type VARCHAR(30),
    commission_value NUMERIC(14,4),
    contract_terms VARCHAR(6000),
    termination_conditions VARCHAR(4000),
    dealer_accepted_at TIMESTAMP,
    bank_accepted_at TIMESTAMP,
    sent_at TIMESTAMP,
    rejection_reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partnership_contract_bank_status ON partnership_contract(bank_id, status);
CREATE INDEX IF NOT EXISTS idx_partnership_contract_dealer_status ON partnership_contract(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_partnership_contract_expiration ON partnership_contract(status, end_date);

-- Existing approved partnerships are grandfathered as accepted FREE contracts.
INSERT INTO partnership_contract (
    contract_number, partnership_id, dealer_id, bank_id, store_id, status,
    start_date, end_date, billing_model, commission_applicable,
    contract_terms, termination_conditions, dealer_accepted_at, bank_accepted_at, sent_at
)
SELECT
    'MTC-LEGACY-' || p.id,
    p.id,
    p.dealer_id,
    p.bank_id,
    p.store_id,
    'ACTIVE',
    COALESCE(p.processing_date::date, CURRENT_DATE),
    (COALESCE(p.processing_date::date, CURRENT_DATE) + INTERVAL '1 year')::date,
    'FREE',
    FALSE,
    'Le partenariat est gratuit et ne requiert aucun abonnement, frais d''activation ou paiement recurrent.',
    'Le partenariat peut etre resilie selon les conditions convenues entre la banque et le concessionnaire.',
    COALESCE(p.processing_date, CURRENT_TIMESTAMP),
    COALESCE(p.processing_date, CURRENT_TIMESTAMP),
    COALESCE(p.processing_date, CURRENT_TIMESTAMP)
FROM dealer_bank_partnership p
WHERE p.status = 'APPROVED'
ON CONFLICT (partnership_id) DO NOTHING;

UPDATE dealer_bank_partnership SET status = 'ACTIVE' WHERE status = 'APPROVED';
