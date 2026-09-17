\encoding UTF8
\set ON_ERROR_STOP on

BEGIN;

DO $seed$
DECLARE
    v_dealer_id BIGINT;
    v_store_id BIGINT;
    v_samsung_id BIGINT;
    v_infinix_id BIGINT;
BEGIN
    SELECT d.id, d.store_id
      INTO v_dealer_id, v_store_id
      FROM dealer d
     WHERE lower(d.company_name) = 'tunisianet'
     ORDER BY d.id
     LIMIT 1;

    IF v_dealer_id IS NULL THEN
        RAISE EXCEPTION 'Le concessionnaire Tunisianet est introuvable.';
    END IF;

    SELECT id
      INTO v_samsung_id
      FROM dealer_product
     WHERE dealer_id = v_dealer_id
       AND lower(name) = lower('Samsung Galaxy S23 5G 256 Go')
     ORDER BY id
     LIMIT 1;

    IF v_samsung_id IS NULL THEN
        INSERT INTO dealer_product (
            dealer_id, store_id, name, description, price, image_url,
            eligibility_conditions, status, total_stock, available_stock,
            reserved_stock, created_at, updated_at
        ) VALUES (
            v_dealer_id,
            v_store_id,
            'Samsung Galaxy S23 5G 256 Go',
            'Smartphone premium compact doté d''un écran Dynamic AMOLED 2X de 6,1 pouces, du processeur Snapdragon 8 Gen 2, de 8 Go de RAM et de 256 Go de stockage. Son triple appareil photo de 50 MP, sa connectivité 5G et sa certification IP68 en font un modèle performant pour un usage quotidien et professionnel.',
            2499.000,
            '/uploads/dealer-products/tunisianet-samsung-galaxy-s23.png',
            'Produit neuf sous garantie. Financement soumis à l''acceptation de la banque partenaire, à la disponibilité du stock et à la présentation des justificatifs demandés.',
            'ACTIVE',
            15,
            15,
            0,
            NOW(),
            NOW()
        ) RETURNING id INTO v_samsung_id;
    ELSE
        UPDATE dealer_product
           SET store_id = v_store_id,
               description = 'Smartphone premium compact doté d''un écran Dynamic AMOLED 2X de 6,1 pouces, du processeur Snapdragon 8 Gen 2, de 8 Go de RAM et de 256 Go de stockage. Son triple appareil photo de 50 MP, sa connectivité 5G et sa certification IP68 en font un modèle performant pour un usage quotidien et professionnel.',
               price = 2499.000,
               image_url = '/uploads/dealer-products/tunisianet-samsung-galaxy-s23.png',
               eligibility_conditions = 'Produit neuf sous garantie. Financement soumis à l''acceptation de la banque partenaire, à la disponibilité du stock et à la présentation des justificatifs demandés.',
               status = 'ACTIVE',
               total_stock = 15,
               available_stock = 15,
               reserved_stock = 0,
               updated_at = NOW()
         WHERE id = v_samsung_id;
    END IF;

    DELETE FROM dealer_product_parameter_value
     WHERE dealer_product_id = v_samsung_id;

    INSERT INTO dealer_product_parameter_value (dealer_product_id, parameter_definition_id, value)
    SELECT v_samsung_id, definition.id, specification.value
      FROM (VALUES
        ('Marque', 'Samsung'),
        ('Modèle', 'Galaxy S23 5G'),
        ('Mémoire RAM', '8 Go'),
        ('Stockage', '256 Go'),
        ('Taille de l’écran', '6,1 pouces'),
        ('Processeur', 'Snapdragon 8 Gen 2 for Galaxy'),
        ('Taux de rafraîchissement', '120 Hz'),
        ('Capacité de Batterie', '3900 mAh'),
        ('Appareil Photo', 'Triple capteur 50 MP + 12 MP + 10 MP'),
        ('Système d''exploitation', 'Android 13 avec One UI 5.1'),
        ('Connectivité', '5G, Wi-Fi 6E, Bluetooth 5.3 et NFC'),
        ('Couleur', 'Noir fantôme'),
        ('Série', 'Galaxy S'),
        ('Référence produit', 'SM-S911B-256-BLK'),
        ('Année de sortie', '2023'),
        ('Taille écran', '6.1'),
        ('Technologie écran', 'Dynamic AMOLED 2X'),
        ('Résolution', '2340 × 1080 pixels FHD+'),
        ('RAM (Go)', '8'),
        ('Stockage interne (Go)', '256'),
        ('Stockage extensible', 'Non'),
        ('Caméra principale', '50 MP + 12 MP ultra grand-angle + 10 MP téléobjectif'),
        ('Caméra frontale', '12 MP'),
        ('Vidéo', '8K à 30 i/s et 4K à 60 i/s'),
        ('Batterie (mAh)', '3900'),
        ('Type de charge', 'USB-C'),
        ('Charge rapide', '25 W'),
        ('Charge sans fil', 'Oui, 15 W'),
        ('Réseau 4G/5G', '5G'),
        ('Wi-Fi', 'Wi-Fi 6E'),
        ('Bluetooth', 'Bluetooth 5.3'),
        ('NFC', 'Oui'),
        ('Type SIM', 'Nano-SIM + eSIM'),
        ('Nombre de SIM', '2'),
        ('Résistance à l''eau', 'IP68'),
        ('Dimensions', '146,3 × 70,9 × 7,6 mm'),
        ('Poids', '168 g'),
        ('Garantie', '24 mois')
      ) AS specification(name, value)
      JOIN product_parameter_definition definition
        ON definition.store_id = v_store_id
       AND definition.name = specification.name;

    IF NOT EXISTS (
        SELECT 1 FROM dealer_product_catalog_image
         WHERE product_id = v_samsung_id
           AND image_url = '/uploads/dealer-product-catalog/tunisianet-samsung-galaxy-s23.png'
    ) THEN
        INSERT INTO dealer_product_catalog_image (product_id, image_url, display_order, created_at)
        VALUES (v_samsung_id, '/uploads/dealer-product-catalog/tunisianet-samsung-galaxy-s23.png', 1, NOW());
    END IF;

    SELECT id
      INTO v_infinix_id
      FROM dealer_product
     WHERE dealer_id = v_dealer_id
       AND lower(name) = lower('Infinix Note 30 5G 256 Go')
     ORDER BY id
     LIMIT 1;

    IF v_infinix_id IS NULL THEN
        INSERT INTO dealer_product (
            dealer_id, store_id, name, description, price, image_url,
            eligibility_conditions, status, total_stock, available_stock,
            reserved_stock, created_at, updated_at
        ) VALUES (
            v_dealer_id,
            v_store_id,
            'Infinix Note 30 5G 256 Go',
            'Smartphone 5G polyvalent équipé d''un grand écran IPS LCD de 6,78 pouces à 120 Hz, d''un processeur MediaTek Dimensity 6080, de 8 Go de RAM et de 256 Go de stockage extensible. Il intègre un appareil photo principal de 108 MP, une batterie de 5000 mAh et une charge rapide de 45 W.',
            899.000,
            '/uploads/dealer-products/tunisianet-infinix-note-30-5g.png',
            'Produit neuf sous garantie. Financement soumis à l''acceptation de la banque partenaire, à la disponibilité du stock et à la présentation des justificatifs demandés.',
            'ACTIVE',
            25,
            25,
            0,
            NOW(),
            NOW()
        ) RETURNING id INTO v_infinix_id;
    ELSE
        UPDATE dealer_product
           SET store_id = v_store_id,
               description = 'Smartphone 5G polyvalent équipé d''un grand écran IPS LCD de 6,78 pouces à 120 Hz, d''un processeur MediaTek Dimensity 6080, de 8 Go de RAM et de 256 Go de stockage extensible. Il intègre un appareil photo principal de 108 MP, une batterie de 5000 mAh et une charge rapide de 45 W.',
               price = 899.000,
               image_url = '/uploads/dealer-products/tunisianet-infinix-note-30-5g.png',
               eligibility_conditions = 'Produit neuf sous garantie. Financement soumis à l''acceptation de la banque partenaire, à la disponibilité du stock et à la présentation des justificatifs demandés.',
               status = 'ACTIVE',
               total_stock = 25,
               available_stock = 25,
               reserved_stock = 0,
               updated_at = NOW()
         WHERE id = v_infinix_id;
    END IF;

    DELETE FROM dealer_product_parameter_value
     WHERE dealer_product_id = v_infinix_id;

    INSERT INTO dealer_product_parameter_value (dealer_product_id, parameter_definition_id, value)
    SELECT v_infinix_id, definition.id, specification.value
      FROM (VALUES
        ('Marque', 'Infinix'),
        ('Modèle', 'Note 30 5G'),
        ('Mémoire RAM', '8 Go'),
        ('Stockage', '256 Go'),
        ('Taille de l’écran', '6,78 pouces'),
        ('Processeur', 'MediaTek Dimensity 6080'),
        ('Taux de rafraîchissement', '120 Hz'),
        ('Capacité de Batterie', '5000 mAh'),
        ('Appareil Photo', 'Triple capteur 108 MP + 2 MP + 2 MP'),
        ('Système d''exploitation', 'Android 13 avec XOS 13'),
        ('Connectivité', '5G, Wi-Fi ac, Bluetooth 5.1 et NFC'),
        ('Couleur', 'Bleu interstellaire'),
        ('Série', 'Note'),
        ('Référence produit', 'X6711-256-BLU'),
        ('Année de sortie', '2023'),
        ('Taille écran', '6.78'),
        ('Technologie écran', 'IPS LCD'),
        ('Résolution', '2460 × 1080 pixels FHD+'),
        ('RAM (Go)', '8'),
        ('Stockage interne (Go)', '256'),
        ('Stockage extensible', 'Oui, microSD'),
        ('Caméra principale', '108 MP + 2 MP + 2 MP'),
        ('Caméra frontale', '16 MP'),
        ('Vidéo', '4K à 30 i/s'),
        ('Batterie (mAh)', '5000'),
        ('Type de charge', 'USB-C'),
        ('Charge rapide', '45 W'),
        ('Charge sans fil', 'Non'),
        ('Réseau 4G/5G', '5G'),
        ('Wi-Fi', 'Wi-Fi 802.11 a/b/g/n/ac'),
        ('Bluetooth', 'Bluetooth 5.1'),
        ('NFC', 'Oui'),
        ('Type SIM', 'Double Nano-SIM'),
        ('Nombre de SIM', '2'),
        ('Résistance à l''eau', 'IP53'),
        ('Dimensions', '168,5 × 76,5 × 8,5 mm'),
        ('Poids', '205 g'),
        ('Garantie', '12 mois')
      ) AS specification(name, value)
      JOIN product_parameter_definition definition
        ON definition.store_id = v_store_id
       AND definition.name = specification.name;

    IF NOT EXISTS (
        SELECT 1 FROM dealer_product_catalog_image
         WHERE product_id = v_infinix_id
           AND image_url = '/uploads/dealer-product-catalog/tunisianet-infinix-note-30-5g.png'
    ) THEN
        INSERT INTO dealer_product_catalog_image (product_id, image_url, display_order, created_at)
        VALUES (v_infinix_id, '/uploads/dealer-product-catalog/tunisianet-infinix-note-30-5g.png', 1, NOW());
    END IF;
END
$seed$;

COMMIT;

SELECT p.id, p.name, p.price, p.status, p.total_stock, p.available_stock,
       COUNT(v.id) AS characteristics, COUNT(DISTINCT image.id) AS catalog_images
  FROM dealer_product p
  LEFT JOIN dealer_product_parameter_value v ON v.dealer_product_id = p.id
  LEFT JOIN dealer_product_catalog_image image ON image.product_id = p.id
 WHERE p.dealer_id = 13
 GROUP BY p.id, p.name, p.price, p.status, p.total_stock, p.available_stock
 ORDER BY p.id;
