-- Suppression des quatre banques dont les identifiants ont été vérifiés.
-- IDs : 66 (Amen), 68 (Tarek Bank), 69 (SRTT Bank), 83 (Banque zitouna inactive).

BEGIN;

DO $$
DECLARE
    target_bank_ids bigint[] := ARRAY[66, 68, 69, 83];
    bank_ids bigint[];
    marketplace_ids bigint[];
    user_ids bigint[];
    request_ids bigint[];
    subscription_ids bigint[];
    payment_ids bigint[];
    marketplace_store_ids bigint[];
    product_ids bigint[];
    financing_request_ids bigint[];
    partnership_ids bigint[];
    certificate_ids bigint[];
    matched_count integer;
BEGIN
    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO bank_ids
      FROM bank
     WHERE id = ANY(target_bank_ids);

    matched_count := cardinality(bank_ids);
    IF matched_count <> cardinality(target_bank_ids) THEN
        RAISE EXCEPTION 'Les quatre banques vérifiées ne sont plus toutes disponibles pour suppression.';
    END IF;

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO marketplace_ids
      FROM marketplace
     WHERE bank_id = ANY(bank_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO user_ids
      FROM users
     WHERE bank_id = ANY(bank_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO request_ids
      FROM request
     WHERE bank_id = ANY(bank_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO subscription_ids
      FROM subscription
     WHERE marketplace_id = ANY(marketplace_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO payment_ids
      FROM payment
     WHERE request_id = ANY(request_ids)
        OR renewal_request_id = ANY(request_ids)
        OR subscription_id = ANY(subscription_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO marketplace_store_ids
      FROM marketplace_store
     WHERE marketplace_id = ANY(marketplace_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO product_ids
      FROM product
     WHERE bank_id = ANY(bank_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO financing_request_ids
      FROM financing_request
     WHERE bank_id = ANY(bank_ids)
        OR product_id = ANY(product_ids)
        OR client_id = ANY(user_ids)
        OR processed_by_id = ANY(user_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO partnership_ids
      FROM dealer_bank_partnership
     WHERE bank_id = ANY(bank_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::bigint[])
      INTO certificate_ids
      FROM certificates
     WHERE bank_id = ANY(bank_ids)
        OR marketplace_id = ANY(marketplace_ids);

    -- Historique, notifications et traces devenus inutiles.
    DELETE FROM certificate_history WHERE certificate_id = ANY(certificate_ids);
    DELETE FROM notifications
     WHERE recipient_id = ANY(user_ids)
        OR related_request_id = ANY(request_ids);
    DELETE FROM audit_logs
     WHERE bank_id = ANY(ARRAY(SELECT id::text FROM unnest(bank_ids) AS id))
        OR marketplace_id = ANY(ARRAY(SELECT id::text FROM unnest(marketplace_ids) AS id))
        OR actor_id = ANY(ARRAY(SELECT id::text FROM unnest(user_ids) AS id))
        OR affected_user_id = ANY(ARRAY(SELECT id::text FROM unnest(user_ids) AS id));

    -- Données de financement, produits et partenariats.
    DELETE FROM financing_request_document
     WHERE financing_request_id = ANY(financing_request_ids);
    DELETE FROM financing_request WHERE id = ANY(financing_request_ids);
    DELETE FROM product_parameter_value WHERE product_id = ANY(product_ids);
    DELETE FROM product WHERE id = ANY(product_ids);
    DELETE FROM product_publication_request
     WHERE bank_id = ANY(bank_ids)
        OR marketplace_id = ANY(marketplace_ids)
        OR partnership_id = ANY(partnership_ids);
    DELETE FROM partnership_contract
     WHERE bank_id = ANY(bank_ids)
        OR partnership_id = ANY(partnership_ids);
    DELETE FROM dealer_bank_partnership WHERE id = ANY(partnership_ids);

    -- Contenu, stores et certificats des marketplaces supprimées.
    DELETE FROM content_visibility
     WHERE marketplace_id = ANY(marketplace_ids)
        OR content_id IN (
            SELECT id FROM marketplace_content WHERE marketplace_id = ANY(marketplace_ids)
        );
    DELETE FROM marketplace_content WHERE marketplace_id = ANY(marketplace_ids);
    DELETE FROM marketplace_store_banner
     WHERE marketplace_store_id = ANY(marketplace_store_ids);
    DELETE FROM marketplace_store_module
     WHERE marketplace_store_id = ANY(marketplace_store_ids);
    DELETE FROM marketplace_store WHERE id = ANY(marketplace_store_ids);
    DELETE FROM certificates WHERE id = ANY(certificate_ids);

    -- Paiements, abonnements et demandes de souscription.
    UPDATE payment
       SET renewed_payment_id = NULL
     WHERE renewed_payment_id = ANY(payment_ids)
       AND NOT (id = ANY(payment_ids));
    DELETE FROM payment WHERE id = ANY(payment_ids);
    UPDATE request
       SET subscription_id = NULL
     WHERE subscription_id = ANY(subscription_ids);
    DELETE FROM subscription WHERE id = ANY(subscription_ids);
    UPDATE request
       SET original_request_id = NULL
     WHERE original_request_id = ANY(request_ids)
       AND NOT (id = ANY(request_ids));
    DELETE FROM request_module_selection
     WHERE request_store_id IN (
         SELECT id FROM request_store_selection WHERE request_id = ANY(request_ids)
     );
    DELETE FROM request_store_selection WHERE request_id = ANY(request_ids);
    DELETE FROM request_module WHERE request_id = ANY(request_ids);
    DELETE FROM request_store WHERE request_id = ANY(request_ids);
    DELETE FROM request WHERE id = ANY(request_ids);

    -- Comptes et entités principales.
    DELETE FROM client_registration_verifications WHERE bank_id = ANY(bank_ids);
    DELETE FROM password_reset_tokens WHERE user_id = ANY(user_ids);
    DELETE FROM refresh_tokens WHERE user_id = ANY(user_ids);
    DELETE FROM users WHERE id = ANY(user_ids);
    DELETE FROM marketplace WHERE id = ANY(marketplace_ids);
    DELETE FROM bank WHERE id = ANY(bank_ids);

    RAISE NOTICE '% banques supprimées avec leurs dépendances.', matched_count;
END $$;

COMMIT;

-- Vérification : cette requête doit retourner 0.
SELECT count(*) AS remaining_requested_banks
FROM bank
WHERE id = ANY(ARRAY[66, 68, 69, 83]);
