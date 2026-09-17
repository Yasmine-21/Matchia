package org.matchia.matchiabackend.ai.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.ai.dto.AiAskRequest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiAssistantServiceTest {

    @Test
    void returnsWelcomeMessageWithoutCallingDependenciesForBlankQuestion() {
        AiAssistantService service = service(mock(GeminiService.class), mock(AiSqlExecutionService.class),
                mock(AiIntentService.class), mock(DatabaseSchemaService.class), mock(SemanticDatabaseMapService.class));

        var response = service.ask(new AiAskRequest("  ", null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("TEXT_TO_SQL");
        assertThat(response.getAnswer()).contains("Bonjour");
    }

    @Test
    void answersGreetingWithoutCallingGeminiOrDatabase() {
        GeminiService gemini = mock(GeminiService.class);
        AiSqlExecutionService executor = mock(AiSqlExecutionService.class);
        DatabaseSchemaService schemaService = mock(DatabaseSchemaService.class);
        SemanticDatabaseMapService semantic = mock(SemanticDatabaseMapService.class);

        var response = service(gemini, executor, new AiIntentService(), schemaService, semantic)
                .ask(new AiAskRequest("Bonjour", null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("CONVERSATION");
        assertThat(response.getAnswer()).isEqualTo("Bonjour, comment puis-je vous aider ?");
        verifyNoInteractions(gemini, executor, schemaService, semantic);
    }

    @Test
    void refusesPasswordRequestWithoutCallingGeminiOrDatabase() {
        GeminiService gemini = mock(GeminiService.class);
        AiSqlExecutionService executor = mock(AiSqlExecutionService.class);
        DatabaseSchemaService schemaService = mock(DatabaseSchemaService.class);
        SemanticDatabaseMapService semantic = mock(SemanticDatabaseMapService.class);

        var response = service(gemini, executor, new AiIntentService(), schemaService, semantic)
                .ask(new AiAskRequest("Quel est le mot de passe de ce concessionnaire ?", null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("SECURITY_REFUSAL");
        assertThat(response.getAnswer()).isEqualTo("Je ne peux pas répondre, les données sont confidentielles.");
        verifyNoInteractions(gemini, executor, schemaService, semantic);
    }

    @Test
    void returnsNoDataWhenValidatedQueryHasNoRows() {
        GeminiService gemini = mock(GeminiService.class);
        AiSqlExecutionService executor = mock(AiSqlExecutionService.class);
        AiIntentService intent = mock(AiIntentService.class);
        DatabaseSchemaService schemaService = mock(DatabaseSchemaService.class);
        SemanticDatabaseMapService semantic = mock(SemanticDatabaseMapService.class);
        DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(
                Map.of("payment", java.util.Set.of("id")), "payment(id bigint)");
        when(intent.analyze(anyString())).thenReturn(new AiIntentService.Analysis(AiIntentService.Intent.PAYMENTS, List.of(), null, false, false, null));
        when(schemaService.loadAllowedSchema()).thenReturn(schema);
        when(semantic.analyze(anyString(), eq(schema))).thenReturn(new SemanticDatabaseMapService.SemanticMap(schema, List.of()));
        when(gemini.generateSql(anyString(), anyString(), anyString())).thenReturn("SELECT id FROM payment LIMIT 50");
        when(gemini.generateCorrectedSql(anyString(), anyString(), anyString(), anyString())).thenReturn("SELECT id FROM payment LIMIT 50");
        when(executor.execute(anyString(), eq(schema))).thenReturn(
                new AiSqlExecutionService.QueryResult("[]", 0, "SELECT id FROM payment LIMIT 50"),
                new AiSqlExecutionService.QueryResult("[]", 0, "SELECT id FROM payment LIMIT 50"));

        var response = service(gemini, executor, intent, schemaService, semantic).ask(new AiAskRequest("paiements", null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("NO_DATA");
        assertThat(response.getAnswer()).contains("Aucune");
        verify(gemini, never()).generateAnswer(anyString(), anyString());
    }

    @Test
    void safelyHandlesSubscriptionsExpiringInTheNextSevenDays() {
        GeminiService gemini = mock(GeminiService.class);
        AiSqlExecutionService executor = mock(AiSqlExecutionService.class);
        DatabaseSchemaService schemaService = mock(DatabaseSchemaService.class);
        SemanticDatabaseMapService semantic = mock(SemanticDatabaseMapService.class);
        DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(
                Map.of(
                        "subscription", java.util.Set.of("marketplace_id", "expiration_date"),
                        "marketplace", java.util.Set.of("id", "bank_id"),
                        "bank", java.util.Set.of("id", "name")
                ),
                Map.of(
                        "subscription", Map.of("marketplace_id", "bigint", "expiration_date", "date"),
                        "marketplace", Map.of("id", "bigint", "bank_id", "bigint"),
                        "bank", Map.of("id", "bigint", "name", "character varying")
                ),
                List.of(
                        new DatabaseSchemaService.ForeignKey("subscription", "marketplace_id", "marketplace", "id"),
                        new DatabaseSchemaService.ForeignKey("marketplace", "bank_id", "bank", "id")
                ),
                "subscription, marketplace, bank"
        );
        when(schemaService.loadAllowedSchema()).thenReturn(schema);
        when(semantic.analyze(anyString(), eq(schema)))
                .thenReturn(new SemanticDatabaseMapService.SemanticMap(schema, List.of()));
        when(executor.execute(anyString(), eq(schema))).thenAnswer(invocation ->
                new AiSqlExecutionService.QueryResult("[]", 0, invocation.getArgument(0)));

        var response = service(gemini, executor, new AiIntentService(), schemaService, semantic).ask(
                new AiAskRequest("Quels sont les abonnements des banques qui vont expirer dans les 7 prochains jours ?",
                        null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("NO_DATA");
        assertThat(response.getAnswer()).contains("Aucune donnée");
        verify(executor).execute(argThat(sql -> sql.contains("CURRENT_DATE + 7")), eq(schema));
        verifyNoInteractions(gemini);
    }

    @Test
    void returnsRejectedMessageWhenSqlValidationRejectsGeneratedQuery() {
        GeminiService gemini = mock(GeminiService.class);
        AiSqlExecutionService executor = mock(AiSqlExecutionService.class);
        AiIntentService intent = mock(AiIntentService.class);
        DatabaseSchemaService schemaService = mock(DatabaseSchemaService.class);
        SemanticDatabaseMapService semantic = mock(SemanticDatabaseMapService.class);
        DatabaseSchemaService.AllowedSchema schema = new DatabaseSchemaService.AllowedSchema(Map.of("payment", java.util.Set.of("id")), "payment(id bigint)");
        when(intent.analyze(anyString())).thenReturn(new AiIntentService.Analysis(AiIntentService.Intent.GENERAL, List.of(), null, false, false, null));
        when(schemaService.loadAllowedSchema()).thenReturn(schema);
        when(semantic.analyze(anyString(), eq(schema))).thenReturn(new SemanticDatabaseMapService.SemanticMap(schema, List.of()));
        when(gemini.generateSql(anyString(), anyString(), anyString())).thenReturn("DELETE FROM payment");
        when(executor.execute(anyString(), eq(schema))).thenThrow(new IllegalArgumentException("unsafe SQL"));

        var response = service(gemini, executor, intent, schemaService, semantic).ask(new AiAskRequest("supprime", null, null, null, null));

        assertThat(response.getResponseType()).isEqualTo("QUERY_REJECTED");
    }

    private AiAssistantService service(GeminiService gemini, AiSqlExecutionService executor, AiIntentService intent,
                                       DatabaseSchemaService schemaService, SemanticDatabaseMapService semantic) {
        return new AiAssistantService(gemini, executor, intent, schemaService, semantic);
    }
}
