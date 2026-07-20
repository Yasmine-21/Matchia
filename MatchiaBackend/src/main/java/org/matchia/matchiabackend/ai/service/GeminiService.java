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
            Use the supplied semantic database map and dynamic schema to select the most relevant table, columns, and verified relationship path.
            Do not rely on a fixed business table. Infer the business meaning from the live table names, allowed column names, data types, and foreign keys.
            Only join tables through a supplied verified foreign-key relationship; never invent a join or compare text to numeric identifiers.
            Do not add role, status, enabled, visible, or any other filter unless the administrator explicitly requested it.
            For text or name lookups, use flexible case-insensitive LOWER(relevant_column) LIKE LOWER('%value%') matching; do not use exact equality for names.
            When a date is supplied as dd/MM/yyyy, use TO_DATE('dd/MM/yyyy', 'DD/MM/YYYY'); for timestamps, use DATE(column) or a day range.
            For recent/latest questions, order by the most relevant allowed date column in DESC order and use the requested limit when available.
            If the question needs a duration or expiration calculation, derive it from the available columns and explicit question context only.
            When the supplied business guidance identifies the authoritative Offers & Subscriptions rule, follow it exactly:
            payment.status = 'paid' identifies a completed payment, not an expired subscription. Use the provided paid_at
            expiration expression. Examples: expired = DATE(payment.paid_at + INTERVAL '1 month') < CURRENT_DATE;
            active = DATE(payment.paid_at + INTERVAL '1 month') >= CURRENT_DATE; remaining days =
            DATE(payment.paid_at + INTERVAL '1 month') - CURRENT_DATE. Never use payment.status = 'expired' for this rule.
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
