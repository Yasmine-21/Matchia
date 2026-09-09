package org.matchia.matchiabackend.service;

import java.text.Normalizer;
import java.util.List;

/** Central catalogue of the common marketplace attributes for each store family. */
public final class StoreProductSchema {
    public enum StoreType { VEHICLE, MOBILE, MEDICAL, REAL_ESTATE, OTHER }

    private static final List<String> MOBILE = List.of(
            "Marque", "Modèle", "Série", "Référence produit", "Année de sortie", "Couleur",
            "Taille écran", "Technologie écran", "Résolution", "Taux de rafraîchissement",
            "Processeur", "RAM (Go)", "Stockage interne (Go)", "Stockage extensible", "Système d'exploitation",
            "Caméra principale", "Caméra frontale", "Vidéo", "Batterie (mAh)", "Type de charge",
            "Charge rapide", "Charge sans fil", "Réseau 4G/5G", "Wi-Fi", "Bluetooth", "NFC", "Type SIM", "Nombre de SIM", "Résistance à l'eau", "Dimensions", "Poids", "Garantie"
    );
    private static final List<String> MEDICAL = List.of(
            "Marque", "Fabricant", "Modèle", "Référence produit", "Catégorie d'équipement", "Pays d'origine",
            "Spécialité médicale", "Usage prévu", "Technologie", "Alimentation", "Tension", "Dimensions", "Poids",
            "Marquage CE", "Certification ISO", "Classe dispositif médical", "Informations réglementaires",
            "Garantie", "Installation incluse", "Maintenance disponible", "Formation incluse", "Support après-vente", "État du produit", "Accessoires inclus"
    );
    private static final List<String> REAL_ESTATE = List.of(
            "Type de bien", "Type de transaction", "Référence produit", "Gouvernorat", "Ville", "Adresse", "Quartier",
            "Surface totale (m²)", "Surface habitable (m²)", "Nombre de pièces", "Nombre de chambres", "Nombre de salles de bain", "Étage", "Nombre d'étages", "Année de construction",
            "Parking", "Garage", "Ascenseur", "Balcon", "Terrasse", "Jardin", "Piscine", "Meublé", "Chauffage", "Climatisation",
            "État du bien", "Disponibilité", "Date de disponibilité", "Prix au m²"
    );

    private StoreProductSchema() { }

    public static StoreType typeOf(String storeName) {
        String value = normalize(storeName);
        if (value.contains("mobile") || value.contains("smartphone") || value.contains("telephone")) return StoreType.MOBILE;
        if (value.contains("medical") || value.contains("sante") || value.contains("health")) return StoreType.MEDICAL;
        if (value.contains("immobilier") || value.contains("realestate") || value.contains("propriet")) return StoreType.REAL_ESTATE;
        if (value.contains("vehicule") || value.contains("vehicle") || value.contains("auto")) return StoreType.VEHICLE;
        return StoreType.OTHER;
    }

    public static List<String> parametersFor(String storeName) {
        return switch (typeOf(storeName)) {
            case MOBILE -> MOBILE;
            case MEDICAL -> MEDICAL;
            case REAL_ESTATE -> REAL_ESTATE;
            default -> List.of();
        };
    }

    public static boolean requiresPositiveNumber(StoreType type, String parameterName) {
        String value = normalize(parameterName);
        return (type == StoreType.MOBILE && (value.contains("ram") || value.contains("stockageinterne") || value.contains("batterie")))
                || (type == StoreType.REAL_ESTATE && (value.contains("surface")));
    }

    public static boolean requiresNonNegativeNumber(StoreType type, String parameterName) {
        String value = normalize(parameterName);
        return type == StoreType.REAL_ESTATE && (value.contains("nombredechambres") || value.contains("nombredesallesdebain") || value.contains("nombredepieces") || value.contains("etage"));
    }

    public static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase().replaceAll("[^a-z0-9]", "");
    }
}
