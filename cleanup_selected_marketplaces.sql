BEGIN;

CREATE TEMP TABLE marketplaces_to_delete (
    id BIGINT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO marketplaces_to_delete (id)
SELECT marketplace.id
FROM marketplace
JOIN bank ON bank.id = marketplace.bank_id
WHERE lower(bank.slug) IN (
    'atb1',
    'ubci123',
    'biat123',
    'assi',
    'kht',
    'tstb',
    'biatnnnn',
    'bh12',
    'wifakkkkkkkkdd'
);

DO $$
BEGIN
    IF (SELECT count(*) FROM marketplaces_to_delete) <> 9 THEN
        RAISE EXCEPTION 'Suppression annulée : 9 marketplaces attendues, % trouvée(s).',
            (SELECT count(*) FROM marketplaces_to_delete);
    END IF;
END $$;

DELETE FROM marketplace_store_banner
WHERE marketplace_store_id IN (
    SELECT id FROM marketplace_store
    WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete)
);

DELETE FROM marketplace_store_module
WHERE marketplace_store_id IN (
    SELECT id FROM marketplace_store
    WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete)
);

DELETE FROM marketplace_store
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

DELETE FROM marketplace_content
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

DELETE FROM content_visibility
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

DELETE FROM product_publication_request
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

DELETE FROM certificates
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

UPDATE request
SET subscription_id = NULL
WHERE subscription_id IN (
    SELECT id FROM subscription
    WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete)
);

DELETE FROM payment
WHERE subscription_id IN (
    SELECT id FROM subscription
    WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete)
);

DELETE FROM subscription
WHERE marketplace_id IN (SELECT id FROM marketplaces_to_delete);

DELETE FROM marketplace
WHERE id IN (SELECT id FROM marketplaces_to_delete);

COMMIT;
