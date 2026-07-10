package org.matchia.matchiabackend.ai.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;

@Service
public class AiIntentService {

    public enum IntentType {
        BANKS,
        STORES,
        MODULES,
        SUBSCRIPTIONS,
        PAYMENTS,
        REQUESTS,
        NOTIFICATIONS,
        MODULE_VISIBILITY,
        GENERAL
    }

    public IntentType detectIntent(String question) {
        String normalized = normalize(question);

        if (containsAny(normalized, "visibil", "ne saffiche pas", "n apparait pas", "n'appara", "affiche pas", "invisible", "visible")) {
            return IntentType.MODULE_VISIBILITY;
        }
        if (containsAny(normalized, "abonnement", "abonnements", "subscription", "renew", "renouvel")) {
            return IntentType.SUBSCRIPTIONS;
        }
        if (containsAny(normalized, "paiement", "paiements", "payment", "paid", "recents", "recent", "recents", "derniers paiements")) {
            return IntentType.PAYMENTS;
        }
        if (containsAny(normalized, "notification", "notifications", "alerte", "alertes")) {
            return IntentType.NOTIFICATIONS;
        }
        if (containsAny(normalized, "demande", "demandes", "request", "requests", "join", "inscription", "inscriptions")) {
            return IntentType.REQUESTS;
        }
        if (containsAny(normalized, "module", "modules", "simulateur", "comparateur", "blog")) {
            return IntentType.MODULES;
        }
        if (containsAny(normalized, "store", "stores", "boutique", "boutiques")) {
            return IntentType.STORES;
        }
        if (containsAny(normalized, "banque", "banques", "bank", "banks")) {
            return IntentType.BANKS;
        }
        return IntentType.GENERAL;
    }

    private boolean containsAny(String value, String... keywords) {
        for (String keyword : keywords) {
            if (value.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return normalized
                .replace('’', '\'')
                .replaceAll("[^a-z0-9\\s']", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
