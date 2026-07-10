package org.matchia.matchiabackend.ai.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.ai.dto.AiAskRequest;
import org.matchia.matchiabackend.ai.dto.AiAskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private static final String SYSTEM_PROMPT = """
            Tu es Matchia AI Assistant, intégré au back office SaaS de Matchia.
            Tu réponds uniquement en français.
            Tu utilises exclusivement le contexte fourni, sans inventer de données.
            Si une information manque, tu expliques clairement ce qu'il faut vérifier.
            Tu ne dévoiles pas de requêtes SQL sauf demande explicite.
            Tu aides l'administrateur SaaS à comprendre les données de la plateforme, les relations banques/marketplaces/stores/modules, la visibilité des modules, les paiements, les demandes, les notifications et les abonnements.
            Réponds de manière claire, professionnelle et structurée.
            """;

    private final AiIntentService aiIntentService;
    private final PlatformContextService platformContextService;
    private final GeminiService geminiService;

    @Transactional(readOnly = true)
    public AiAskResponse ask(AiAskRequest request) {
        String question = request != null ? request.getQuestion() : null;
        if (question == null || question.isBlank()) {
            return new AiAskResponse(
                    "Bonjour, posez-moi une question sur les banques, les marketplaces, les stores, les modules, les paiements ou les demandes.",
                    AiIntentService.IntentType.GENERAL.name()
            );
        }

        AiIntentService.IntentType intentType = aiIntentService.detectIntent(question);
        String context = platformContextService.buildContext(request, intentType);
        String userPrompt = buildUserPrompt(request, question, intentType, context);
        String answer = geminiService.generateAnswer(SYSTEM_PROMPT, userPrompt);

        return new AiAskResponse(answer, intentType.name());
    }

    private String buildUserPrompt(AiAskRequest request, String question, AiIntentService.IntentType intentType, String context) {
        StringBuilder builder = new StringBuilder();
        builder.append("Question de l'administrateur: ").append(question.trim()).append("\n\n");
        builder.append("Intent détecté: ").append(intentType.name()).append("\n");
        builder.append("Page courante: ").append(request != null && request.getCurrentPage() != null && !request.getCurrentPage().isBlank()
                ? request.getCurrentPage().trim()
                : "/").append("\n");
        if (request != null && request.getBankId() != null) {
            builder.append("bankId: ").append(request.getBankId()).append("\n");
        }
        if (request != null && request.getMarketplaceId() != null) {
            builder.append("marketplaceId: ").append(request.getMarketplaceId()).append("\n");
        }
        if (request != null && request.getStoreId() != null) {
            builder.append("storeId: ").append(request.getStoreId()).append("\n");
        }
        builder.append("\nContexte plateforme autorisé:\n");
        builder.append(context);
        builder.append("\n\nRéponds uniquement avec les informations utiles tirées du contexte ci-dessus.");
        return builder.toString();
    }
}
