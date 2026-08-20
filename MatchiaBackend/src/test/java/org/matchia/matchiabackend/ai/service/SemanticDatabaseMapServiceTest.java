package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SemanticDatabaseMapServiceTest {
    private final SemanticDatabaseMapService service = new SemanticDatabaseMapService();
    private final DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(
            Map.of("payment", Set.of("id", "amount", "paid_at", "subscription_id"),
                    "subscription", Set.of("id", "start_date", "expiration_date")),
            Map.of("payment", Map.of("id", "bigint", "amount", "numeric", "paid_at", "timestamp", "subscription_id", "bigint"),
                    "subscription", Map.of("id", "bigint", "start_date", "date", "expiration_date", "date")),
            List.of(new DatabaseSchemaService.ForeignKey("payment", "subscription_id", "subscription", "id")), "schema");

    @Test
    void ranksSemanticCandidatesAndBuildsSafePromptContext() {
        SemanticDatabaseMapService.SemanticMap map = service.analyze("combien de paiements récents", schema);
        assertThat(map.candidates()).isNotEmpty();
        assertThat(map.candidates().get(0).table()).isEqualTo("payment");
        assertThat(map.promptContext()).contains("payment", "Sensitive columns are omitted");
    }

    @Test
    void returnsNoCandidateForOnlyStopWords() {
        assertThat(service.analyze("le et des", schema).candidates()).isEmpty();
    }
}
