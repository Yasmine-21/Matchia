BEGIN;

CREATE TEMP TABLE seed_product (
    existing_id bigint,
    dealer_id bigint NOT NULL,
    store_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    description varchar(3000) NOT NULL,
    price numeric(14,2) NOT NULL,
    stock integer NOT NULL,
    eligibility_conditions varchar(3000) NOT NULL,
    slug varchar(255) NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_product VALUES
(1, 11, 1, 'BMW X1 sDrive18i 2025', 'SUV compact premium neuf, finition xLine, moteur essence 1,5 L TwinPower Turbo, boîte automatique à double embrayage et équipements de sécurité avancés. Véhicule adapté aux trajets urbains et routiers.', 169900, 6, 'Véhicule neuf sous garantie constructeur. Financement soumis à l''accord de la banque partenaire, avec justificatifs d''identité, de revenus et apport selon le dossier.', 'auto-plus-bmw-x1-2025'),
(2, 11, 1, 'Peugeot 208 Allure 2025', 'Citadine neuve cinq portes en finition Allure, économique et confortable, dotée d''un moteur essence PureTech, d''une boîte automatique et d''aides modernes à la conduite.', 79900, 10, 'Véhicule neuf sous garantie constructeur. Financement soumis à l''accord de la banque partenaire, avec justificatifs d''identité, de revenus et apport selon le dossier.', 'auto-plus-peugeot-208-2025'),
(3, 11, 1, 'Chery Tiggo 4 Pro 2025', 'SUV urbain neuf offrant un habitacle spacieux, un moteur essence turbo, une boîte CVT et un ensemble complet d''équipements multimédias et de sécurité.', 82900, 8, 'Véhicule neuf sous garantie constructeur. Financement soumis à l''accord de la banque partenaire, avec justificatifs d''identité, de revenus et apport selon le dossier.', 'auto-plus-chery-tiggo-4-pro'),
(NULL, 13, 2, 'Xiaomi Redmi Note 13 Pro 5G 256 Go', 'Smartphone 5G avec écran AMOLED 6,67 pouces 120 Hz, processeur Snapdragon 7s Gen 2, appareil photo principal 200 MP, batterie 5100 mAh et charge rapide 67 W.', 1299, 20, 'Produit neuf sous garantie. Financement soumis à l''acceptation de la banque partenaire, à la disponibilité du stock et à la présentation des justificatifs demandés.', 'tunisianet-xiaomi-redmi-note-13-pro'),
(NULL, 12, 4, 'Appartement S+3 aux Jardins de Carthage', 'Appartement lumineux de haut standing dans une résidence sécurisée, avec séjour ouvrant sur terrasse, suite parentale, deux chambres, cuisine équipée et deux places de parking.', 620000, 1, 'Bien disponible à la vente. Financement soumis à l''étude de la banque, à la vérification des revenus, de l''apport personnel et des documents juridiques du bien.', 'auto-store-appartement-s3-carthage'),
(NULL, 12, 4, 'Villa moderne avec piscine à Gammarth', 'Villa contemporaine indépendante avec vue dégagée, vaste séjour, quatre suites, cuisine équipée, jardin paysager, piscine et garage pour deux véhicules.', 1450000, 1, 'Bien disponible à la vente. Financement soumis à l''étude de la banque, à la vérification des revenus, de l''apport personnel et des documents juridiques du bien.', 'auto-store-villa-gammarth'),
(NULL, 12, 4, 'Bureau 140 m² au Centre Urbain Nord', 'Bureau moderne aménagé en open space avec trois salles, kitchenette, sanitaires, climatisation centrale, câblage réseau et deux places de parking au sous-sol.', 490000, 1, 'Bien à usage professionnel disponible à la vente. Financement soumis à l''accord de la banque et à la conformité du dossier juridique et financier.', 'auto-store-bureau-centre-urbain-nord'),
(NULL, 14, 4, 'Appartement S+2 au Lac 2', 'Appartement neuf dans une résidence récente, composé d''un salon avec balcon, de deux chambres dont une suite, d''une cuisine équipée et d''une place de parking.', 540000, 1, 'Bien disponible à la vente. Financement soumis à l''étude de la banque, à la vérification des revenus, de l''apport personnel et des documents juridiques du bien.', 'galaxy-appartement-s2-lac2'),
(NULL, 14, 4, 'Villa contemporaine à La Marsa', 'Villa contemporaine proche de la mer, comprenant cinq suites, de grands espaces de vie, une cuisine haut de gamme, un jardin, une piscine et un garage.', 1750000, 1, 'Bien disponible à la vente. Financement soumis à l''étude de la banque, à la vérification des revenus, de l''apport personnel et des documents juridiques du bien.', 'galaxy-villa-la-marsa'),
(NULL, 14, 4, 'Local commercial 180 m² à Ariana Centre', 'Local commercial en angle sur une artère passante, avec grande façade vitrée, espace principal modulable, réserve, sanitaires et accès indépendant.', 680000, 1, 'Local disponible à la vente pour activité autorisée. Financement soumis à l''accord bancaire et à la validation des documents juridiques et commerciaux.', 'galaxy-local-commercial-ariana'),
(NULL, 15, 3, 'Échographe portable SonoView P8', 'Échographe portable couleur destiné aux examens abdominaux, obstétricaux, vasculaires et musculosquelettiques, fourni avec deux sondes, chariot et logiciel de mesure.', 48500, 4, 'Vente réservée aux professionnels et établissements de santé. Installation, formation et garantie incluses. Financement soumis à validation du dossier professionnel.', 'pharmatec-echographe-sonoview-p8'),
(NULL, 15, 3, 'Moniteur patient multiparamétrique MP12', 'Moniteur 12 pouces pour la surveillance ECG, SpO2, pression non invasive, respiration et température, avec alarmes configurables et batterie de secours.', 8900, 10, 'Vente réservée aux professionnels et établissements de santé. Mise en service et garantie incluses. Financement soumis à validation du dossier professionnel.', 'pharmatec-moniteur-patient-mp12'),
(NULL, 15, 3, 'Autoclave médical SteriPro 23 L', 'Autoclave de classe B à chambre de 23 litres pour la stérilisation d''instruments emballés ou creux, avec cycles programmés, séchage et traçabilité USB.', 12900, 7, 'Vente réservée aux professionnels et établissements de santé. Installation, qualification initiale et garantie incluses. Financement soumis à validation du dossier professionnel.', 'pharmatec-autoclave-steripro-23l');

DO $seed$
DECLARE
    r seed_product%ROWTYPE;
    target_id bigint;
BEGIN
    FOR r IN SELECT * FROM seed_product LOOP
        target_id := NULL;
        IF r.existing_id IS NOT NULL THEN
            UPDATE dealer_product
               SET dealer_id = r.dealer_id,
                   store_id = r.store_id,
                   name = r.name,
                   description = r.description,
                   price = r.price,
                   status = 'ACTIVE',
                   eligibility_conditions = r.eligibility_conditions,
                   total_stock = r.stock,
                   available_stock = r.stock - LEAST(
                       r.stock,
                       (SELECT COUNT(*)::integer FROM financing_request fr
                         WHERE fr.dealer_product_id = r.existing_id AND fr.status = 'ACCEPTED')
                   ),
                   reserved_stock = LEAST(
                       r.stock,
                       (SELECT COUNT(*)::integer FROM financing_request fr
                         WHERE fr.dealer_product_id = r.existing_id AND fr.status = 'ACCEPTED')
                   ),
                   image_url = '/uploads/dealer-products/' || r.slug || '-1.png',
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = r.existing_id
             RETURNING id INTO target_id;
        ELSE
            SELECT id INTO target_id
              FROM dealer_product
             WHERE dealer_id = r.dealer_id AND name = r.name
             ORDER BY id LIMIT 1;

            IF target_id IS NULL THEN
                INSERT INTO dealer_product (
                    created_at, updated_at, dealer_id, store_id, name, description,
                    price, status, eligibility_conditions, total_stock,
                    available_stock, reserved_stock, image_url
                ) VALUES (
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, r.dealer_id, r.store_id,
                    r.name, r.description, r.price, 'ACTIVE', r.eligibility_conditions,
                    r.stock, r.stock, 0,
                    '/uploads/dealer-products/' || r.slug || '-1.png'
                ) RETURNING id INTO target_id;
            ELSE
                UPDATE dealer_product
                   SET store_id = r.store_id,
                       description = r.description,
                       price = r.price,
                       status = 'ACTIVE',
                       eligibility_conditions = r.eligibility_conditions,
                       total_stock = r.stock,
                       available_stock = r.stock - LEAST(
                           r.stock,
                           (SELECT COUNT(*)::integer FROM financing_request fr
                             WHERE fr.dealer_product_id = target_id AND fr.status = 'ACCEPTED')
                       ),
                       reserved_stock = LEAST(
                           r.stock,
                           (SELECT COUNT(*)::integer FROM financing_request fr
                             WHERE fr.dealer_product_id = target_id AND fr.status = 'ACCEPTED')
                       ),
                       image_url = '/uploads/dealer-products/' || r.slug || '-1.png',
                       updated_at = CURRENT_TIMESTAMP
                 WHERE id = target_id;
            END IF;
        END IF;
    END LOOP;
END
$seed$;

CREATE TEMP TABLE seed_param (
    dealer_id bigint NOT NULL,
    product_name varchar(255) NOT NULL,
    parameter_name varchar(255) NOT NULL,
    value varchar(2000)
) ON COMMIT DROP;

-- Véhicules Auto Plus++
INSERT INTO seed_param VALUES
(11,'BMW X1 sDrive18i 2025','Marque','BMW'),
(11,'BMW X1 sDrive18i 2025','Modèle','X1 sDrive18i xLine'),
(11,'BMW X1 sDrive18i 2025','Carrosserie','SUV compact, 5 portes'),
(11,'BMW X1 sDrive18i 2025','Motorisation','Essence 1.5 L TwinPower Turbo, 136 ch'),
(11,'BMW X1 sDrive18i 2025','Puissance fiscale','7 CV'),
(11,'BMW X1 sDrive18i 2025','Puissance électrique','Non applicable'),
(11,'BMW X1 sDrive18i 2025','Boîte de vitesse','Automatique Steptronic 7 rapports'),
(11,'BMW X1 sDrive18i 2025','Consommation','6,3 L/100 km (cycle mixte)'),
(11,'BMW X1 sDrive18i 2025','Vitesse maxi','208 km/h'),
(11,'BMW X1 sDrive18i 2025','Batterie','12 V, démarrage et accessoires'),
(11,'Peugeot 208 Allure 2025','Marque','Peugeot'),
(11,'Peugeot 208 Allure 2025','Modèle','208 Allure PureTech 100 EAT8'),
(11,'Peugeot 208 Allure 2025','Carrosserie','Citadine, 5 portes'),
(11,'Peugeot 208 Allure 2025','Motorisation','Essence 1.2 L PureTech, 100 ch'),
(11,'Peugeot 208 Allure 2025','Puissance fiscale','5 CV'),
(11,'Peugeot 208 Allure 2025','Puissance électrique','Non applicable'),
(11,'Peugeot 208 Allure 2025','Boîte de vitesse','Automatique EAT8'),
(11,'Peugeot 208 Allure 2025','Consommation','5,4 L/100 km (cycle mixte)'),
(11,'Peugeot 208 Allure 2025','Vitesse maxi','188 km/h'),
(11,'Peugeot 208 Allure 2025','Batterie','12 V, démarrage et accessoires'),
(11,'Chery Tiggo 4 Pro 2025','Marque','Chery'),
(11,'Chery Tiggo 4 Pro 2025','Modèle','Tiggo 4 Pro 1.5T'),
(11,'Chery Tiggo 4 Pro 2025','Carrosserie','SUV urbain, 5 portes'),
(11,'Chery Tiggo 4 Pro 2025','Motorisation','Essence 1.5 L turbo, 147 ch'),
(11,'Chery Tiggo 4 Pro 2025','Puissance fiscale','8 CV'),
(11,'Chery Tiggo 4 Pro 2025','Puissance électrique','Non applicable'),
(11,'Chery Tiggo 4 Pro 2025','Boîte de vitesse','Automatique CVT'),
(11,'Chery Tiggo 4 Pro 2025','Consommation','7,1 L/100 km (cycle mixte)'),
(11,'Chery Tiggo 4 Pro 2025','Vitesse maxi','185 km/h'),
(11,'Chery Tiggo 4 Pro 2025','Batterie','12 V, démarrage et accessoires');

-- Smartphone supplémentaire Tunisianet
INSERT INTO seed_param VALUES
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Marque','Xiaomi'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Modèle','Redmi Note 13 Pro 5G'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Mémoire RAM','8 Go'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Stockage','256 Go'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Taille de l’écran','6,67 pouces'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Processeur','Qualcomm Snapdragon 7s Gen 2'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Taux de rafraîchissement','120 Hz'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Capacité de Batterie','5100 mAh'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Appareil Photo','200 MP + 8 MP + 2 MP'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Système d''exploitation','Android 13 avec MIUI 14'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Connectivité','5G, Wi-Fi, Bluetooth, NFC, USB-C'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Couleur','Noir minuit'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Série','Redmi Note'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Référence produit','RN13P5G-8-256-BLK'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Année de sortie','2024'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Taille écran','6,67'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Technologie écran','AMOLED CrystalRes'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Résolution','2712 × 1220 pixels'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','RAM (Go)','8'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Stockage interne (Go)','256'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Stockage extensible','Non'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Caméra principale','200 MP OIS + 8 MP + 2 MP'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Caméra frontale','16 MP'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Vidéo','4K à 30 i/s'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Batterie (mAh)','5100'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Type de charge','USB-C'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Charge rapide','67 W'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Charge sans fil','Non'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Réseau 4G/5G','5G'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Wi-Fi','Wi-Fi 802.11 a/b/g/n/ac'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Bluetooth','Bluetooth 5.2'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','NFC','Oui'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Type SIM','Double Nano-SIM'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Nombre de SIM','2'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Résistance à l''eau','IP54'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Dimensions','161,2 × 74,2 × 8,0 mm'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Poids','187 g'),
(13,'Xiaomi Redmi Note 13 Pro 5G 256 Go','Garantie','12 mois');

-- Biens immobiliers Auto Store
INSERT INTO seed_param VALUES
(12,'Appartement S+3 aux Jardins de Carthage','Type de bien','Appartement S+3'),
(12,'Appartement S+3 aux Jardins de Carthage','Localisation','Jardins de Carthage, Tunis'),
(12,'Appartement S+3 aux Jardins de Carthage','Surface totale','185 m²'),
(12,'Appartement S+3 aux Jardins de Carthage','Nombre de pièces','4'),
(12,'Appartement S+3 aux Jardins de Carthage','Nombre de salles de bain','2'),
(12,'Appartement S+3 aux Jardins de Carthage','Étage','4e étage'),
(12,'Appartement S+3 aux Jardins de Carthage','État du bien','Neuf'),
(12,'Appartement S+3 aux Jardins de Carthage','Disponibilité parking','Oui, 2 places'),
(12,'Appartement S+3 aux Jardins de Carthage','Présence d’ascenseur','Oui'),
(12,'Appartement S+3 aux Jardins de Carthage','Chauffage','Chauffage central'),
(12,'Appartement S+3 aux Jardins de Carthage','Climatisation','Climatisation split'),
(12,'Appartement S+3 aux Jardins de Carthage','Balcon / terrasse','Terrasse de 24 m²'),
(12,'Appartement S+3 aux Jardins de Carthage','Jardin','Jardin commun'),
(12,'Appartement S+3 aux Jardins de Carthage','Type de transaction','Vente'),
(12,'Appartement S+3 aux Jardins de Carthage','Référence produit','AS-APT-CAR-001'),
(12,'Appartement S+3 aux Jardins de Carthage','Gouvernorat','Tunis'),
(12,'Appartement S+3 aux Jardins de Carthage','Ville','Carthage'),
(12,'Appartement S+3 aux Jardins de Carthage','Adresse','Avenue de Carthage, Jardins de Carthage'),
(12,'Appartement S+3 aux Jardins de Carthage','Quartier','Jardins de Carthage'),
(12,'Appartement S+3 aux Jardins de Carthage','Surface totale (m²)','185'),
(12,'Appartement S+3 aux Jardins de Carthage','Surface habitable (m²)','161'),
(12,'Appartement S+3 aux Jardins de Carthage','Nombre de chambres','3'),
(12,'Appartement S+3 aux Jardins de Carthage','Nombre d''étages','7'),
(12,'Appartement S+3 aux Jardins de Carthage','Année de construction','2025'),
(12,'Appartement S+3 aux Jardins de Carthage','Parking','2 places au sous-sol'),
(12,'Appartement S+3 aux Jardins de Carthage','Garage','Non'),
(12,'Appartement S+3 aux Jardins de Carthage','Ascenseur','Oui'),
(12,'Appartement S+3 aux Jardins de Carthage','Balcon','Oui'),
(12,'Appartement S+3 aux Jardins de Carthage','Terrasse','Oui, 24 m²'),
(12,'Appartement S+3 aux Jardins de Carthage','Piscine','Non'),
(12,'Appartement S+3 aux Jardins de Carthage','Meublé','Non'),
(12,'Appartement S+3 aux Jardins de Carthage','Disponibilité','Immédiate'),
(12,'Appartement S+3 aux Jardins de Carthage','Date de disponibilité','15/09/2026'),
(12,'Appartement S+3 aux Jardins de Carthage','Prix au m²','3351 TND/m²'),
(12,'Villa moderne avec piscine à Gammarth','Type de bien','Villa indépendante'),
(12,'Villa moderne avec piscine à Gammarth','Localisation','Gammarth Supérieur, La Marsa'),
(12,'Villa moderne avec piscine à Gammarth','Surface totale','620 m²'),
(12,'Villa moderne avec piscine à Gammarth','Nombre de pièces','8'),
(12,'Villa moderne avec piscine à Gammarth','Nombre de salles de bain','5'),
(12,'Villa moderne avec piscine à Gammarth','Étage','RDC + 1 étage'),
(12,'Villa moderne avec piscine à Gammarth','État du bien','Excellent état'),
(12,'Villa moderne avec piscine à Gammarth','Disponibilité parking','Oui'),
(12,'Villa moderne avec piscine à Gammarth','Présence d’ascenseur','Non'),
(12,'Villa moderne avec piscine à Gammarth','Chauffage','Chauffage central'),
(12,'Villa moderne avec piscine à Gammarth','Climatisation','Climatisation centrale'),
(12,'Villa moderne avec piscine à Gammarth','Balcon / terrasse','Terrasses panoramiques'),
(12,'Villa moderne avec piscine à Gammarth','Jardin','Jardin paysager de 280 m²'),
(12,'Villa moderne avec piscine à Gammarth','Type de transaction','Vente'),
(12,'Villa moderne avec piscine à Gammarth','Référence produit','AS-VIL-GAM-002'),
(12,'Villa moderne avec piscine à Gammarth','Gouvernorat','Tunis'),
(12,'Villa moderne avec piscine à Gammarth','Ville','La Marsa'),
(12,'Villa moderne avec piscine à Gammarth','Adresse','Gammarth Supérieur'),
(12,'Villa moderne avec piscine à Gammarth','Quartier','Gammarth Supérieur'),
(12,'Villa moderne avec piscine à Gammarth','Surface totale (m²)','620'),
(12,'Villa moderne avec piscine à Gammarth','Surface habitable (m²)','410'),
(12,'Villa moderne avec piscine à Gammarth','Nombre de chambres','4'),
(12,'Villa moderne avec piscine à Gammarth','Nombre d''étages','2'),
(12,'Villa moderne avec piscine à Gammarth','Année de construction','2022'),
(12,'Villa moderne avec piscine à Gammarth','Parking','3 places extérieures'),
(12,'Villa moderne avec piscine à Gammarth','Garage','Garage 2 voitures'),
(12,'Villa moderne avec piscine à Gammarth','Ascenseur','Non'),
(12,'Villa moderne avec piscine à Gammarth','Balcon','Oui'),
(12,'Villa moderne avec piscine à Gammarth','Terrasse','Oui'),
(12,'Villa moderne avec piscine à Gammarth','Piscine','Oui, 10 × 4 m'),
(12,'Villa moderne avec piscine à Gammarth','Meublé','Non'),
(12,'Villa moderne avec piscine à Gammarth','Disponibilité','Immédiate'),
(12,'Villa moderne avec piscine à Gammarth','Date de disponibilité','15/09/2026'),
(12,'Villa moderne avec piscine à Gammarth','Prix au m²','2339 TND/m²'),
(12,'Bureau 140 m² au Centre Urbain Nord','Type de bien','Bureau'),
(12,'Bureau 140 m² au Centre Urbain Nord','Localisation','Centre Urbain Nord, Tunis'),
(12,'Bureau 140 m² au Centre Urbain Nord','Surface totale','140 m²'),
(12,'Bureau 140 m² au Centre Urbain Nord','Nombre de pièces','4 espaces'),
(12,'Bureau 140 m² au Centre Urbain Nord','Nombre de salles de bain','2'),
(12,'Bureau 140 m² au Centre Urbain Nord','Étage','5e étage'),
(12,'Bureau 140 m² au Centre Urbain Nord','État du bien','Très bon état'),
(12,'Bureau 140 m² au Centre Urbain Nord','Disponibilité parking','Oui, 2 places'),
(12,'Bureau 140 m² au Centre Urbain Nord','Présence d’ascenseur','Oui'),
(12,'Bureau 140 m² au Centre Urbain Nord','Chauffage','Chauffage central'),
(12,'Bureau 140 m² au Centre Urbain Nord','Climatisation','Climatisation centrale'),
(12,'Bureau 140 m² au Centre Urbain Nord','Balcon / terrasse','Balcon de 8 m²'),
(12,'Bureau 140 m² au Centre Urbain Nord','Jardin','Non'),
(12,'Bureau 140 m² au Centre Urbain Nord','Type de transaction','Vente'),
(12,'Bureau 140 m² au Centre Urbain Nord','Référence produit','AS-BUR-CUN-003'),
(12,'Bureau 140 m² au Centre Urbain Nord','Gouvernorat','Tunis'),
(12,'Bureau 140 m² au Centre Urbain Nord','Ville','Tunis'),
(12,'Bureau 140 m² au Centre Urbain Nord','Adresse','Rue de la Bourse, Centre Urbain Nord'),
(12,'Bureau 140 m² au Centre Urbain Nord','Quartier','Centre Urbain Nord'),
(12,'Bureau 140 m² au Centre Urbain Nord','Surface totale (m²)','140'),
(12,'Bureau 140 m² au Centre Urbain Nord','Surface habitable (m²)','132'),
(12,'Bureau 140 m² au Centre Urbain Nord','Nombre de chambres','3 bureaux fermés'),
(12,'Bureau 140 m² au Centre Urbain Nord','Nombre d''étages','8'),
(12,'Bureau 140 m² au Centre Urbain Nord','Année de construction','2019'),
(12,'Bureau 140 m² au Centre Urbain Nord','Parking','2 places au sous-sol'),
(12,'Bureau 140 m² au Centre Urbain Nord','Garage','Non'),
(12,'Bureau 140 m² au Centre Urbain Nord','Ascenseur','Oui, 2 ascenseurs'),
(12,'Bureau 140 m² au Centre Urbain Nord','Balcon','Oui'),
(12,'Bureau 140 m² au Centre Urbain Nord','Terrasse','Non'),
(12,'Bureau 140 m² au Centre Urbain Nord','Piscine','Non'),
(12,'Bureau 140 m² au Centre Urbain Nord','Meublé','Semi-meublé'),
(12,'Bureau 140 m² au Centre Urbain Nord','Disponibilité','Immédiate'),
(12,'Bureau 140 m² au Centre Urbain Nord','Date de disponibilité','15/09/2026'),
(12,'Bureau 140 m² au Centre Urbain Nord','Prix au m²','3500 TND/m²');

-- Biens immobiliers Galaxy Groupe
INSERT INTO seed_param
SELECT 14, replace(product_name, 'Auto Store', 'Galaxy Groupe'), parameter_name, value
FROM (VALUES
('Appartement S+2 au Lac 2','Type de bien','Appartement S+2'),
('Appartement S+2 au Lac 2','Localisation','Les Berges du Lac 2, Tunis'),
('Appartement S+2 au Lac 2','Surface totale','142 m²'),
('Appartement S+2 au Lac 2','Nombre de pièces','3'),
('Appartement S+2 au Lac 2','Nombre de salles de bain','2'),
('Appartement S+2 au Lac 2','Étage','3e étage'),
('Appartement S+2 au Lac 2','État du bien','Neuf'),
('Appartement S+2 au Lac 2','Disponibilité parking','Oui, 1 place'),
('Appartement S+2 au Lac 2','Présence d’ascenseur','Oui'),
('Appartement S+2 au Lac 2','Chauffage','Chauffage central'),
('Appartement S+2 au Lac 2','Climatisation','Climatisation split'),
('Appartement S+2 au Lac 2','Balcon / terrasse','Balcon de 12 m²'),
('Appartement S+2 au Lac 2','Jardin','Non'),
('Appartement S+2 au Lac 2','Type de transaction','Vente'),
('Appartement S+2 au Lac 2','Référence produit','GG-APT-LAC2-001'),
('Appartement S+2 au Lac 2','Gouvernorat','Tunis'),
('Appartement S+2 au Lac 2','Ville','Tunis'),
('Appartement S+2 au Lac 2','Adresse','Rue de la Feuille d''Érable, Lac 2'),
('Appartement S+2 au Lac 2','Quartier','Les Berges du Lac 2'),
('Appartement S+2 au Lac 2','Surface totale (m²)','142'),
('Appartement S+2 au Lac 2','Surface habitable (m²)','130'),
('Appartement S+2 au Lac 2','Nombre de chambres','2'),
('Appartement S+2 au Lac 2','Nombre d''étages','6'),
('Appartement S+2 au Lac 2','Année de construction','2026'),
('Appartement S+2 au Lac 2','Parking','1 place au sous-sol'),
('Appartement S+2 au Lac 2','Garage','Non'),
('Appartement S+2 au Lac 2','Ascenseur','Oui'),
('Appartement S+2 au Lac 2','Balcon','Oui'),
('Appartement S+2 au Lac 2','Terrasse','Non'),
('Appartement S+2 au Lac 2','Piscine','Non'),
('Appartement S+2 au Lac 2','Meublé','Non'),
('Appartement S+2 au Lac 2','Disponibilité','Immédiate'),
('Appartement S+2 au Lac 2','Date de disponibilité','15/09/2026'),
('Appartement S+2 au Lac 2','Prix au m²','3803 TND/m²'),
('Villa contemporaine à La Marsa','Type de bien','Villa indépendante'),
('Villa contemporaine à La Marsa','Localisation','La Marsa Plage, Tunis'),
('Villa contemporaine à La Marsa','Surface totale','710 m²'),
('Villa contemporaine à La Marsa','Nombre de pièces','10'),
('Villa contemporaine à La Marsa','Nombre de salles de bain','6'),
('Villa contemporaine à La Marsa','Étage','RDC + 2 étages'),
('Villa contemporaine à La Marsa','État du bien','Excellent état'),
('Villa contemporaine à La Marsa','Disponibilité parking','Oui'),
('Villa contemporaine à La Marsa','Présence d’ascenseur','Oui'),
('Villa contemporaine à La Marsa','Chauffage','Chauffage au sol'),
('Villa contemporaine à La Marsa','Climatisation','Climatisation centrale'),
('Villa contemporaine à La Marsa','Balcon / terrasse','Terrasses avec vue mer'),
('Villa contemporaine à La Marsa','Jardin','Jardin paysager de 320 m²'),
('Villa contemporaine à La Marsa','Type de transaction','Vente'),
('Villa contemporaine à La Marsa','Référence produit','GG-VIL-MAR-002'),
('Villa contemporaine à La Marsa','Gouvernorat','Tunis'),
('Villa contemporaine à La Marsa','Ville','La Marsa'),
('Villa contemporaine à La Marsa','Adresse','Quartier Corniche, La Marsa'),
('Villa contemporaine à La Marsa','Quartier','La Marsa Plage'),
('Villa contemporaine à La Marsa','Surface totale (m²)','710'),
('Villa contemporaine à La Marsa','Surface habitable (m²)','480'),
('Villa contemporaine à La Marsa','Nombre de chambres','5'),
('Villa contemporaine à La Marsa','Nombre d''étages','3'),
('Villa contemporaine à La Marsa','Année de construction','2023'),
('Villa contemporaine à La Marsa','Parking','4 places extérieures'),
('Villa contemporaine à La Marsa','Garage','Garage 2 voitures'),
('Villa contemporaine à La Marsa','Ascenseur','Oui'),
('Villa contemporaine à La Marsa','Balcon','Oui'),
('Villa contemporaine à La Marsa','Terrasse','Oui'),
('Villa contemporaine à La Marsa','Piscine','Oui, piscine à débordement'),
('Villa contemporaine à La Marsa','Meublé','Partiellement meublé'),
('Villa contemporaine à La Marsa','Disponibilité','Immédiate'),
('Villa contemporaine à La Marsa','Date de disponibilité','15/09/2026'),
('Villa contemporaine à La Marsa','Prix au m²','2465 TND/m²'),
('Local commercial 180 m² à Ariana Centre','Type de bien','Local commercial'),
('Local commercial 180 m² à Ariana Centre','Localisation','Ariana Centre'),
('Local commercial 180 m² à Ariana Centre','Surface totale','180 m²'),
('Local commercial 180 m² à Ariana Centre','Nombre de pièces','3 espaces'),
('Local commercial 180 m² à Ariana Centre','Nombre de salles de bain','2'),
('Local commercial 180 m² à Ariana Centre','Étage','Rez-de-chaussée'),
('Local commercial 180 m² à Ariana Centre','État du bien','Rénové'),
('Local commercial 180 m² à Ariana Centre','Disponibilité parking','Parking public à proximité'),
('Local commercial 180 m² à Ariana Centre','Présence d’ascenseur','Non applicable'),
('Local commercial 180 m² à Ariana Centre','Chauffage','Climatisation réversible'),
('Local commercial 180 m² à Ariana Centre','Climatisation','Climatisation centrale'),
('Local commercial 180 m² à Ariana Centre','Balcon / terrasse','Non'),
('Local commercial 180 m² à Ariana Centre','Jardin','Non'),
('Local commercial 180 m² à Ariana Centre','Type de transaction','Vente'),
('Local commercial 180 m² à Ariana Centre','Référence produit','GG-LOC-ARI-003'),
('Local commercial 180 m² à Ariana Centre','Gouvernorat','Ariana'),
('Local commercial 180 m² à Ariana Centre','Ville','Ariana'),
('Local commercial 180 m² à Ariana Centre','Adresse','Avenue Habib Bourguiba, Ariana'),
('Local commercial 180 m² à Ariana Centre','Quartier','Ariana Centre'),
('Local commercial 180 m² à Ariana Centre','Surface totale (m²)','180'),
('Local commercial 180 m² à Ariana Centre','Surface habitable (m²)','176'),
('Local commercial 180 m² à Ariana Centre','Nombre de chambres','2 réserves'),
('Local commercial 180 m² à Ariana Centre','Nombre d''étages','1'),
('Local commercial 180 m² à Ariana Centre','Année de construction','2017'),
('Local commercial 180 m² à Ariana Centre','Parking','Public'),
('Local commercial 180 m² à Ariana Centre','Garage','Non'),
('Local commercial 180 m² à Ariana Centre','Ascenseur','Non'),
('Local commercial 180 m² à Ariana Centre','Balcon','Non'),
('Local commercial 180 m² à Ariana Centre','Terrasse','Non'),
('Local commercial 180 m² à Ariana Centre','Piscine','Non'),
('Local commercial 180 m² à Ariana Centre','Meublé','Non'),
('Local commercial 180 m² à Ariana Centre','Disponibilité','Immédiate'),
('Local commercial 180 m² à Ariana Centre','Date de disponibilité','15/09/2026'),
('Local commercial 180 m² à Ariana Centre','Prix au m²','3778 TND/m²')
) AS v(product_name, parameter_name, value);

-- Équipements médicaux Pharmatec
INSERT INTO seed_param VALUES
(15,'Échographe portable SonoView P8','PARAM MEdical 1','Échographie couleur portable'),
(15,'Échographe portable SonoView P8','param 2','Deux sondes incluses'),
(15,'Échographe portable SonoView P8','Marque','SonoView'),
(15,'Échographe portable SonoView P8','Fabricant','Mediscan Technologies'),
(15,'Échographe portable SonoView P8','Modèle','P8 Color Doppler'),
(15,'Échographe portable SonoView P8','Référence produit','PH-SV-P8-2026'),
(15,'Échographe portable SonoView P8','Catégorie d''équipement','Imagerie médicale'),
(15,'Échographe portable SonoView P8','Pays d''origine','Corée du Sud'),
(15,'Échographe portable SonoView P8','Spécialité médicale','Radiologie, gynécologie, vasculaire'),
(15,'Échographe portable SonoView P8','Usage prévu','Examens échographiques diagnostiques'),
(15,'Échographe portable SonoView P8','Technologie','Doppler couleur, B/M/CFM/PW'),
(15,'Échographe portable SonoView P8','Alimentation','Secteur et batterie rechargeable'),
(15,'Échographe portable SonoView P8','Tension','100–240 V, 50/60 Hz'),
(15,'Échographe portable SonoView P8','Dimensions','39 × 36 × 8 cm'),
(15,'Échographe portable SonoView P8','Poids','6,5 kg'),
(15,'Échographe portable SonoView P8','Marquage CE','Oui'),
(15,'Échographe portable SonoView P8','Certification ISO','ISO 13485'),
(15,'Échographe portable SonoView P8','Classe dispositif médical','Classe IIa'),
(15,'Échographe portable SonoView P8','Informations réglementaires','Dispositif destiné aux professionnels de santé'),
(15,'Échographe portable SonoView P8','Garantie','24 mois'),
(15,'Échographe portable SonoView P8','Installation incluse','Oui'),
(15,'Échographe portable SonoView P8','Maintenance disponible','Contrat préventif et correctif'),
(15,'Échographe portable SonoView P8','Formation incluse','1 journée sur site'),
(15,'Échographe portable SonoView P8','Support après-vente','Assistance téléphonique et intervention sur site'),
(15,'Échographe portable SonoView P8','État du produit','Neuf'),
(15,'Échographe portable SonoView P8','Accessoires inclus','Sonde convexe, sonde linéaire, chariot, housse'),
(15,'Moniteur patient multiparamétrique MP12','PARAM MEdical 1','Surveillance multiparamétrique'),
(15,'Moniteur patient multiparamétrique MP12','param 2','Écran couleur 12 pouces'),
(15,'Moniteur patient multiparamétrique MP12','Marque','VitalCare'),
(15,'Moniteur patient multiparamétrique MP12','Fabricant','VitalCare Medical Systems'),
(15,'Moniteur patient multiparamétrique MP12','Modèle','MP12'),
(15,'Moniteur patient multiparamétrique MP12','Référence produit','PH-VC-MP12-2026'),
(15,'Moniteur patient multiparamétrique MP12','Catégorie d''équipement','Monitorage patient'),
(15,'Moniteur patient multiparamétrique MP12','Pays d''origine','Allemagne'),
(15,'Moniteur patient multiparamétrique MP12','Spécialité médicale','Urgences, réanimation, bloc opératoire'),
(15,'Moniteur patient multiparamétrique MP12','Usage prévu','Surveillance continue des signes vitaux'),
(15,'Moniteur patient multiparamétrique MP12','Technologie','ECG, SpO2, NIBP, RESP, TEMP'),
(15,'Moniteur patient multiparamétrique MP12','Alimentation','Secteur et batterie lithium-ion'),
(15,'Moniteur patient multiparamétrique MP12','Tension','100–240 V, 50/60 Hz'),
(15,'Moniteur patient multiparamétrique MP12','Dimensions','32 × 27 × 16 cm'),
(15,'Moniteur patient multiparamétrique MP12','Poids','4,2 kg'),
(15,'Moniteur patient multiparamétrique MP12','Marquage CE','Oui'),
(15,'Moniteur patient multiparamétrique MP12','Certification ISO','ISO 13485'),
(15,'Moniteur patient multiparamétrique MP12','Classe dispositif médical','Classe IIb'),
(15,'Moniteur patient multiparamétrique MP12','Informations réglementaires','Dispositif destiné aux professionnels de santé'),
(15,'Moniteur patient multiparamétrique MP12','Garantie','24 mois'),
(15,'Moniteur patient multiparamétrique MP12','Installation incluse','Oui'),
(15,'Moniteur patient multiparamétrique MP12','Maintenance disponible','Oui'),
(15,'Moniteur patient multiparamétrique MP12','Formation incluse','Démonstration de 3 heures'),
(15,'Moniteur patient multiparamétrique MP12','Support après-vente','Hotline et pièces disponibles'),
(15,'Moniteur patient multiparamétrique MP12','État du produit','Neuf'),
(15,'Moniteur patient multiparamétrique MP12','Accessoires inclus','Câble ECG, capteur SpO2, brassard NIBP, sonde température'),
(15,'Autoclave médical SteriPro 23 L','PARAM MEdical 1','Stérilisateur vapeur de classe B'),
(15,'Autoclave médical SteriPro 23 L','param 2','Chambre inox 23 litres'),
(15,'Autoclave médical SteriPro 23 L','Marque','SteriPro'),
(15,'Autoclave médical SteriPro 23 L','Fabricant','Sterilab Equipment'),
(15,'Autoclave médical SteriPro 23 L','Modèle','SP-B23'),
(15,'Autoclave médical SteriPro 23 L','Référence produit','PH-SP-B23-2026'),
(15,'Autoclave médical SteriPro 23 L','Catégorie d''équipement','Stérilisation'),
(15,'Autoclave médical SteriPro 23 L','Pays d''origine','Italie'),
(15,'Autoclave médical SteriPro 23 L','Spécialité médicale','Cabinets, cliniques et laboratoires'),
(15,'Autoclave médical SteriPro 23 L','Usage prévu','Stérilisation vapeur des instruments médicaux'),
(15,'Autoclave médical SteriPro 23 L','Technologie','Pré-vide fractionné, séchage sous vide'),
(15,'Autoclave médical SteriPro 23 L','Alimentation','Secteur'),
(15,'Autoclave médical SteriPro 23 L','Tension','220–240 V, 50 Hz'),
(15,'Autoclave médical SteriPro 23 L','Dimensions','48 × 45 × 68 cm'),
(15,'Autoclave médical SteriPro 23 L','Poids','53 kg'),
(15,'Autoclave médical SteriPro 23 L','Marquage CE','Oui'),
(15,'Autoclave médical SteriPro 23 L','Certification ISO','ISO 13485, EN 13060'),
(15,'Autoclave médical SteriPro 23 L','Classe dispositif médical','Classe IIb'),
(15,'Autoclave médical SteriPro 23 L','Informations réglementaires','Conforme aux exigences de stérilisation en milieu médical'),
(15,'Autoclave médical SteriPro 23 L','Garantie','24 mois'),
(15,'Autoclave médical SteriPro 23 L','Installation incluse','Oui, avec qualification initiale'),
(15,'Autoclave médical SteriPro 23 L','Maintenance disponible','Contrat annuel disponible'),
(15,'Autoclave médical SteriPro 23 L','Formation incluse','Formation opérateur incluse'),
(15,'Autoclave médical SteriPro 23 L','Support après-vente','Technicien agréé et pièces de rechange'),
(15,'Autoclave médical SteriPro 23 L','État du produit','Neuf'),
(15,'Autoclave médical SteriPro 23 L','Accessoires inclus','3 plateaux, support, clé USB, tuyau de vidange');

-- Remplace toutes les valeurs des produits ciblés par les données complètes ci-dessus.
DELETE FROM dealer_product_parameter_value pv
USING dealer_product p, seed_product sp
WHERE pv.dealer_product_id = p.id
  AND p.dealer_id = sp.dealer_id
  AND p.name = sp.name;

INSERT INTO dealer_product_parameter_value (dealer_product_id, parameter_definition_id, value)
SELECT p.id, ppd.id, prm.value
FROM seed_param prm
JOIN dealer_product p
  ON p.dealer_id = prm.dealer_id AND p.name = prm.product_name
JOIN product_parameter_definition ppd
  ON ppd.store_id = p.store_id AND ppd.name = prm.parameter_name;

-- Chaque produit ciblé reçoit exactement quatre images de galerie ordonnées.
DELETE FROM dealer_product_catalog_image g
USING dealer_product p, seed_product sp
WHERE g.product_id = p.id
  AND p.dealer_id = sp.dealer_id
  AND p.name = sp.name;

INSERT INTO dealer_product_catalog_image (created_at, display_order, image_url, product_id)
SELECT CURRENT_TIMESTAMP,
       v.display_order,
       '/uploads/dealer-product-catalog/' || sp.slug || '-' || v.display_order || '.png',
       p.id
FROM seed_product sp
JOIN dealer_product p
  ON p.dealer_id = sp.dealer_id AND p.name = sp.name
CROSS JOIN (VALUES (1), (2), (3), (4)) AS v(display_order);

-- Les deux smartphones déjà créés sont conservés et leur galerie est normalisée à 4 images.
UPDATE dealer_product
SET image_url = CASE id
    WHEN 4 THEN '/uploads/dealer-products/tunisianet-samsung-galaxy-s23-1.png'
    WHEN 5 THEN '/uploads/dealer-products/tunisianet-infinix-note-30-5g-1.png'
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN (4, 5);

DELETE FROM dealer_product_catalog_image WHERE product_id IN (4, 5);

INSERT INTO dealer_product_catalog_image (created_at, display_order, image_url, product_id)
SELECT CURRENT_TIMESTAMP,
       v.display_order,
       '/uploads/dealer-product-catalog/' || x.slug || '-' || v.display_order || '.png',
       x.product_id
FROM (VALUES
    (4::bigint, 'tunisianet-samsung-galaxy-s23'),
    (5::bigint, 'tunisianet-infinix-note-30-5g')
) AS x(product_id, slug)
CROSS JOIN (VALUES (1), (2), (3), (4)) AS v(display_order);

COMMIT;
