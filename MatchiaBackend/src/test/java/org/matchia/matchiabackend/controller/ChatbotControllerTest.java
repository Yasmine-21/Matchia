package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ChatbotControllerTest {

    private final ChatbotController controller = new ChatbotController();

    @Test
    void returnsPromptForMissingMessage() {
        assertThat(controller.handleMessage(Map.of()).getBody().get("reply"))
                .contains("Envoyez-moi une question");
    }

    @Test
    void trimsAndEchoesSuppliedMessage() {
        assertThat(controller.handleMessage(Map.of("message", "  Bonjour  ")).getBody().get("reply"))
                .contains("Bonjour");
    }
}
