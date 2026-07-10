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
                            "temperature", 0.2,
                            "topP", 0.95,
                            "maxOutputTokens", 1024
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
