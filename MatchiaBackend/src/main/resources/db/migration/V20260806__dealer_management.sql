-- Additive PostgreSQL migration for the dealer management space.
-- Existing bank products, marketplaces, payments and subscriptions are not altered.

CREATE TABLE IF NOT EXISTS dealer_account_request (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) NOT NULL,
    address VARCHAR(1000) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(32) NOT NULL,
    rejection_reason VARCHAR(1000),
    submitted_at TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_request_document (
    request_id BIGINT NOT NULL REFERENCES dealer_account_request(id) ON DELETE CASCADE,
    document_url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS dealer (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(1000) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS dealer_id BIGINT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_dealer') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS dealer_bank_partnership (
    id BIGSERIAL PRIMARY KEY,
    dealer_id BIGINT NOT NULL REFERENCES dealer(id),
    bank_id BIGINT NOT NULL REFERENCES bank(id),
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(32) NOT NULL,
    message VARCHAR(1000),
    rejection_reason VARCHAR(1000),
    request_date TIMESTAMP,
    processing_date TIMESTAMP,
    CONSTRAINT uk_dealer_bank_store UNIQUE (dealer_id, bank_id, store_id)
);

CREATE TABLE IF NOT EXISTS dealer_product (
    id BIGSERIAL PRIMARY KEY,
    dealer_id BIGINT NOT NULL REFERENCES dealer(id),
    store_id BIGINT NOT NULL REFERENCES store(id),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(3000),
    price NUMERIC(14,2) NOT NULL,
    image_url VARCHAR(255),
    eligibility_conditions VARCHAR(3000),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_product_parameter_value (
    id BIGSERIAL PRIMARY KEY,
    dealer_product_id BIGINT NOT NULL REFERENCES dealer_product(id) ON DELETE CASCADE,
    parameter_definition_id BIGINT NOT NULL REFERENCES product_parameter_definition(id),
    value VARCHAR(2000),
    CONSTRAINT uk_dealer_product_parameter UNIQUE (dealer_product_id, parameter_definition_id)
);

CREATE TABLE IF NOT EXISTS product_publication_request (
    id BIGSERIAL PRIMARY KEY,
    dealer_product_id BIGINT NOT NULL REFERENCES dealer_product(id),
    dealer_id BIGINT NOT NULL REFERENCES dealer(id),
    partnership_id BIGINT NOT NULL REFERENCES dealer_bank_partnership(id),
    bank_id BIGINT NOT NULL REFERENCES bank(id),
    marketplace_id BIGINT NOT NULL REFERENCES marketplace(id),
    store_id BIGINT NOT NULL REFERENCES store(id),
    status VARCHAR(32) NOT NULL,
    rejection_reason VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP,
    processed_at TIMESTAMP,
    CONSTRAINT uk_dealer_product_bank_store UNIQUE (dealer_product_id, bank_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_request_status_date ON dealer_account_request(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealer_partnership_bank_status ON dealer_bank_partnership(bank_id, status);
CREATE INDEX IF NOT EXISTS idx_dealer_product_owner_status ON dealer_product(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_publication_marketplace_store_status
    ON product_publication_request(marketplace_id, store_id, status, active);
