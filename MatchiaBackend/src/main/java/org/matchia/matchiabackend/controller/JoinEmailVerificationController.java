package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import org.matchia.matchiabackend.dto.JoinEmailVerificationSendRequest;
import org.matchia.matchiabackend.dto.JoinEmailVerificationSendResponse;
import org.matchia.matchiabackend.dto.JoinEmailVerificationVerifyRequest;
import org.matchia.matchiabackend.dto.JoinEmailVerificationVerifyResponse;
import org.matchia.matchiabackend.service.JoinEmailVerificationException;
import org.matchia.matchiabackend.service.JoinEmailVerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/join-requests/email-verification")
public class JoinEmailVerificationController {

    private final JoinEmailVerificationService verificationService;

    public JoinEmailVerificationController(JoinEmailVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping("/send")
    public ResponseEntity<JoinEmailVerificationSendResponse> sendCode(
            @Valid @RequestBody JoinEmailVerificationSendRequest request
    ) {
        return ResponseEntity.ok(verificationService.sendCode(request.email()));
    }

    @PostMapping("/verify")
    public ResponseEntity<JoinEmailVerificationVerifyResponse> verifyCode(
            @Valid @RequestBody JoinEmailVerificationVerifyRequest request
    ) {
        return ResponseEntity.ok(verificationService.verifyCode(request.email(), request.code()));
    }

    @ExceptionHandler(JoinEmailVerificationException.class)
    public ResponseEntity<Map<String, Object>> handleVerificationException(JoinEmailVerificationException exception) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", exception.getMessage());
        if (exception.getRetryAfterSeconds() > 0) {
            body.put("retryAfterSeconds", exception.getRetryAfterSeconds());
        }
        return ResponseEntity.status(exception.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Les donnees de verification sont invalides.");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
