package org.matchia.matchiabackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceChatbotRequest;
import org.matchia.matchiabackend.dto.MarketplaceChatbotResponse;
import org.matchia.matchiabackend.service.MarketplaceChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    private final MarketplaceChatbotService marketplaceChatbotService;

    @PostMapping("/message")
    public ResponseEntity<MarketplaceChatbotResponse> handleMessage(
            @RequestBody MarketplaceChatbotRequest payload,
            HttpServletRequest request) {
        return ResponseEntity.ok(marketplaceChatbotService.answer(payload, request));
    }
}
