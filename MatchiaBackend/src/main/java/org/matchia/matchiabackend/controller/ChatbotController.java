package org.matchia.matchiabackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    @PostMapping("/message")
    public ResponseEntity<Map<String, String>> handleMessage(@RequestBody Map<String, String> payload) {
        String message = payload.getOrDefault("message", "").trim();
        String reply = message.isEmpty()
                ? "Envoyez-moi une question sur le backoffice Matchia."
                : "Message recu. Une integration IA ou webhook pourra traiter : \"" + message + "\".";

        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
