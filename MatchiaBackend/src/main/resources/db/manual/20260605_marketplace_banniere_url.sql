ALTER TABLE marketplace
    ADD COLUMN IF NOT EXISTS banniere_url VARCHAR(255);

ALTER TABLE request
    ADD COLUMN IF NOT EXISTS banniere_url VARCHAR(255);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'marketplace'
          AND column_name = 'banner_image_url'
    ) THEN
        UPDATE marketplace
        SET banniere_url = banner_image_url
        WHERE banniere_url IS NULL
          AND banner_image_url IS NOT NULL;
    END IF;
END $$;
