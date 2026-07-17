package org.matchia.matchiabackend.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    private static final String SQL_SYSTEM_PROMPT = """
            You generate PostgreSQL for a SaaS administrator.
            Return exactly one SQL SELECT statement and nothing else: no Markdown, explanation, comments, or semicolon.
            End every generated query with LIMIT 50.
            Use only the supplied schema. Never use SELECT *, credentials, tokens, passwords, secrets, system tables, or write operations.
            The supplied schema contains the live tables, safe columns, data types, and verified foreign-key relationships. Use those relationships for joins; never invent table or column names.
            Always prefer explicit JOINs between the allowed tables and return every matching record unless the question clearly asks for an aggregate.
            When joining tables, always alias repeated column names with user-friendly unique aliases so the result set remains readable.
            For people, users, banks, stores, marketplaces, and modules, use flexible case-insensitive search:
            LOWER(column) LIKE LOWER('%value%'). Do not use exact name equality unless the administrator supplied an ID.
            For a user lookup, search users.full_name and users.email when those columns exist in the supplied schema.
            The words 'user' and 'utilisateur' are generic; never add a role filter unless the administrator explicitly requested a role.
            Email, full_name, names, statuses, amounts, dates, bank names, marketplace slugs, store names, and module names are allowed when present in the schema.
            When the user provides a date in dd/MM/yyyy, convert it with TO_DATE('dd/MM/yyyy', 'DD/MM/YYYY') before comparing it with database dates.
            For subscription questions, use a real subscription table if it appears in the supplied schema. Otherwise, use payment rows with LOWER(payment.status) = 'paid' and calculate expiration as DATE(payment.paid_at + INTERVAL '1 month').
            For a subscription-expiration date, compare DATE(payment.paid_at + INTERVAL '1 month') to TO_DATE('dd/MM/yyyy', 'DD/MM/YYYY').
            For store/module assignment questions, use the real relation tables in the supplied schema (for example module_store, marketplace_store, or marketplace_store_module) and do not filter by status, enabled, or visible unless requested.
            Search store and module names with LOWER(...) LIKE LOWER(...).
            If remaining days are requested, compute them from the expiration date and CURRENT_TIMESTAMP using only allowed SQL constructs.
            If the question asks for recent/latest items, order by the most relevant date column in DESC order and use the requested limit when available.
            Always prefer a precise aggregate for count/total questions and use COUNT(*).
            """;
    private static final String SQL_CORRECTION_SYSTEM_PROMPT = SQL_SYSTEM_PROMPT + """

            The previous validated query returned zero rows. Generate a corrected or broader query that still respects
            every explicit constraint in the administrator's question. Do not invent data, tables, columns, or business rules.
            Use flexible LOWER(column) LIKE LOWER('%value%') matching for names and text, unless the administrator explicitly
            supplied an identifier. Do not add role filters unless explicitly requested. Return only the replacement SQL SELECT.
            """;

    private static final String FALLBACK_MESSAGE =
            "Je ne peux pas joindre Gemini pour le moment. Veuillez réessayer dans quelques instants ou vérifier le contexte fourni.";
    private static final String CONFIG_ERROR_MESSAGE =
            "Gemini n'est pas configuré correctement côté backend. Vérifiez la clé API Gemini et le modèle configuré.";
    private static final String AUTH_ERROR_MESSAGE =
            "L'accès à Gemini a été refusé. Vérifiez la clé API et les droits du modèle configuré.";
    private static final String MODEL_ERROR_MESSAGE =
            "Le modèle Gemini configuré est introuvable ou indisponible. Vérifiez la valeur de GEMINI_MODEL.";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-3.1-flash-lite}")
    private String model;

    @Value("${gemini.url:}")
    private String geminiUrl;

    public String generateAnswer(String systemPrompt, String userPrompt) {
        return generateContent(systemPrompt, userPrompt, 0.2, 1024);
    }

    public String generateSql(String question, String allowedSchema) {
        return generateSql(question, null, allowedSchema);
    }

    public String generateSql(String question, String guidance, String allowedSchema) {
        StringBuilder prompt = new StringBuilder(allowedSchema)
                .append("\n\nQuestion administrateur:\n")
                .append(question.trim());
        if (hasText(guidance)) {
            prompt.append("\n\nConsignes de compréhension métier:\n").append(guidance.trim());
        }
        return generateContent(SQL_SYSTEM_PROMPT, prompt.toString(), 0.0, 768);
    }

    public String generateCorrectedSql(String question, String guidance, String allowedSchema, String originalSql) {
        StringBuilder prompt = new StringBuilder(allowedSchema)
                .append("\n\nQuestion administrateur:\n")
                .append(question.trim())
                .append("\n\nPremiere requete validee ayant retourne zero ligne:\n")
                .append(originalSql.trim())
                .append("\n\nLa premiere requete a ete executee avec succes mais son resultat est vide. "
                        + "Genere une requete SELECT corrigee ou plus large, sans supprimer les contraintes explicitement demandees.");
        if (hasText(guidance)) {
            prompt.append("\n\nConsignes de comprehension metier:\n").append(guidance.trim());
        }
        return generateContent(SQL_CORRECTION_SYSTEM_PROMPT, prompt.toString(), 0.0, 768);
    }

    private String generateContent(String systemPrompt, String userPrompt, double temperature, int maxOutputTokens) {
        if (!hasText(apiKey)) {
            log.warn("Gemini API key is not configured.");
            return CONFIG_ERROR_MESSAGE;
        }

        try {
            String endpoint = resolveEndpoint();
            String requestUrl = endpoint.contains("?")
                    ? endpoint + "&key=" + encode(apiKey.trim())
                    : endpoint + "?key=" + encode(apiKey.trim());
            Map<String, Object> payload = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of("text", systemPrompt))
                    ),
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(Map.of("text", userPrompt))
                            )
                    ),
                    "generationConfig", Map.of(
                            "temperature", temperature,
                            "topP", 0.95,
                            "maxOutputTokens", maxOutputTokens
                    )
            );

            String responseBody = webClient.post()
                    .uri(requestUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(45))
                    .block();

            if (!hasText(responseBody)) {
                return FALLBACK_MESSAGE;
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray()) {
                for (JsonNode candidate : candidates) {
                    JsonNode content = candidate.path("content");
                    JsonNode parts = content.path("parts");
                    if (parts.isArray()) {
                        for (JsonNode part : parts) {
                            String text = part.path("text").asText(null);
                            if (hasText(text)) {
                                return text.trim();
                            }
                        }
                    }
                }
            }

            JsonNode textNode = root.path("text");
            if (hasText(textNode.asText(null))) {
                return textNode.asText().trim();
            }

            log.warn("Gemini response did not contain text: {}", responseBody);
            return FALLBACK_MESSAGE;
        } catch (WebClientResponseException e) {
            int status = e.getStatusCode().value();
            log.error("Gemini API error (status={}): {}", status, e.getResponseBodyAsString(), e);
            if (status == 401 || status == 403) {
                return AUTH_ERROR_MESSAGE;
            }
            if (status == 404) {
                return MODEL_ERROR_MESSAGE;
            }
            return FALLBACK_MESSAGE;
        } catch (Exception e) {
            log.error("Unable to call Gemini API.", e);
            return FALLBACK_MESSAGE;
        }
    }

    private String resolveEndpoint() {
        String trimmedUrl = hasText(geminiUrl) ? geminiUrl.trim() : "";
        if (hasText(trimmedUrl)) {
            if (trimmedUrl.contains("{model}")) {
                return trimmedUrl.replace("{model}", model.trim());
            }
            if (trimmedUrl.contains(":generateContent")) {
                return trimmedUrl;
            }
        }
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model.trim() + ":generateContent";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
