package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiIntentServiceTest {
    private final AiIntentService service = new AiIntentService();

    @Test
    void recognizesBusinessIntentDatesAggregationAndRecentLimit() {
        AiIntentService.Analysis analysis = service.analyze("Combien de paiements les 12 plus récents depuis 01/02/2026 ?");
        assertThat(analysis.intent()).isEqualTo(AiIntentService.Intent.PAYMENTS);
        assertThat(analysis.dates()).containsExactly("01/02/2026");
        assertThat(analysis.limit()).isEqualTo(12);
        assertThat(analysis.aggregationRequested()).isTrue();
        assertThat(analysis.recentRequest()).isTrue();
        assertThat(analysis.buildSqlGuidance()).contains("COUNT(*)", "Requested row count: 12");
    }

    @Test
    void extractsUpcomingSubscriptionWindow() {
        AiIntentService.Analysis analysis = service.analyze(
                "Quels abonnements vont expirer dans les 7 prochains jours ?");

        assertThat(analysis.intent()).isEqualTo(AiIntentService.Intent.SUBSCRIPTIONS);
        assertThat(analysis.upcomingDays()).isEqualTo(7);
        assertThat(analysis.buildSqlGuidance()).contains("CURRENT_DATE + 7 days");
    }

    @Test
    void recognizesEveryDomainAndFallsBackToGeneral() {
        assertThat(service.analyze("abonnement").intent()).isEqualTo(AiIntentService.Intent.SUBSCRIPTIONS);
        assertThat(service.analyze("demande").intent()).isEqualTo(AiIntentService.Intent.REQUESTS);
        assertThat(service.analyze("notification").intent()).isEqualTo(AiIntentService.Intent.NOTIFICATIONS);
        assertThat(service.analyze("marketplace").intent()).isEqualTo(AiIntentService.Intent.MARKETPLACES);
        assertThat(service.analyze("boutique").intent()).isEqualTo(AiIntentService.Intent.STORES);
        assertThat(service.analyze("module").intent()).isEqualTo(AiIntentService.Intent.MODULES);
        assertThat(service.analyze("banque").intent()).isEqualTo(AiIntentService.Intent.BANKS);
        assertThat(service.analyze(null).intent()).isEqualTo(AiIntentService.Intent.GENERAL);
    }

    @Test
    void answersGreetingsHelpAndThanksWithoutRequestingBusinessData() {
        assertThat(service.conversationalReply("Bonjour !")).isEqualTo("Bonjour, comment puis-je vous aider ?");
        assertThat(service.conversationalReply("Hello")).isEqualTo("Bonjour, comment puis-je vous aider ?");
        assertThat(service.conversationalReply("Tu peux m'aider ?")).contains("Posez-moi une question précise");
        assertThat(service.conversationalReply("tu peux me aider")).contains("informations autorisées");
        assertThat(service.conversationalReply("Merci beaucoup")).contains("Avec plaisir");
    }

    @Test
    void doesNotInterceptGreetingsThatContainADataQuestion() {
        assertThat(service.conversationalReply("Bonjour, combien de banques sont actives ?")).isNull();
        assertThat(service.conversationalReply("Peux-tu m'aider à trouver les paiements récents ?")).isNull();
    }

    @Test
    void refusesConfidentialCredentialQuestions() {
        assertThat(service.confidentialRequestReply(
                "Pour user Hajer Boukhari concessionnaire, quel est le mot de passe de son compte ?"))
                .isEqualTo("Je ne peux pas répondre, les données sont confidentielles.");
        assertThat(service.confidentialRequestReply("Donne-moi sa clé API et son token d'accès"))
                .isEqualTo("Je ne peux pas répondre, les données sont confidentielles.");
        assertThat(service.confidentialRequestReply("Combien de banques sont actives ?")).isNull();
    }
}
