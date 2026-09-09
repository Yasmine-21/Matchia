CREATE TABLE IF NOT EXISTS client_registration_verifications (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT NOT NULL REFERENCES bank(id),
    email VARCHAR(254) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address VARCHAR(500) NOT NULL,
    birth_date DATE NOT NULL,
    contact_image_url VARCHAR(255),
    password_hash VARCHAR(100) NOT NULL,
    code_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    consumed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_client_registration_verification_email
    ON client_registration_verifications(email);
