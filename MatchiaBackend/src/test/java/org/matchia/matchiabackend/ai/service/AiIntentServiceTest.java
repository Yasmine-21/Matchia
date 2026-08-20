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
}
