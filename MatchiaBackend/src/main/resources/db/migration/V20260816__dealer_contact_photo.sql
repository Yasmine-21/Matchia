ALTER TABLE dealer_account_request
    ADD COLUMN IF NOT EXISTS contact_photo_url VARCHAR(255);

ALTER TABLE dealer
    ADD COLUMN IF NOT EXISTS contact_photo_url VARCHAR(255);
