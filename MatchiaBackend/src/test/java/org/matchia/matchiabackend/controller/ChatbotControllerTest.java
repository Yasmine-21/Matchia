package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceChatbotRequest;
import org.matchia.matchiabackend.dto.MarketplaceChatbotResponse;
import org.matchia.matchiabackend.service.MarketplaceChatbotService;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatbotControllerTest {

    private final MarketplaceChatbotService service = mock(MarketplaceChatbotService.class);
    private final ChatbotController controller = new ChatbotController(service);

    @Test
    void delegatesTheContextualMessageToTheMarketplaceService() {
        MarketplaceChatbotRequest payload = new MarketplaceChatbotRequest("Quels produits sont disponibles ?", 3L, null);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MarketplaceChatbotResponse response = new MarketplaceChatbotResponse("Voici les produits disponibles.", "PRODUCT_SEARCH");
        when(service.answer(same(payload), same(request))).thenReturn(response);

        assertThat(controller.handleMessage(payload, request).getBody()).isEqualTo(response);
        verify(service).answer(payload, request);
    }
}
