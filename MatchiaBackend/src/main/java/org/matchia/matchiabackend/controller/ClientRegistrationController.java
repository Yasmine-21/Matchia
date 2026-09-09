package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationResendRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationResponse;
import org.matchia.matchiabackend.service.ClientRegistrationVerificationException;
import org.matchia.matchiabackend.service.ClientRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/client-registration")
@RequiredArgsConstructor
public class ClientRegistrationController {
    private final ClientRegistrationService registrationService;

    @PostMapping
    public ResponseEntity<ClientRegistrationVerificationResponse> register(@Valid @RequestBody ClientRegistrationRequest request) {
        return ResponseEntity.accepted().body(registrationService.register(request));
    }

    @PostMapping("/verify")
    public ResponseEntity<ClientProfileDto> verify(@Valid @RequestBody ClientRegistrationVerificationRequest request) {
        return ResponseEntity.status(201).body(registrationService.verifyCode(request.email(), request.code()));
    }

    @PostMapping("/resend")
    public ResponseEntity<ClientRegistrationVerificationResponse> resend(@Valid @RequestBody ClientRegistrationResendRequest request) {
        return ResponseEntity.ok(registrationService.resendCode(request.email()));
    }

    @ExceptionHandler(ClientRegistrationVerificationException.class)
    public ResponseEntity<Map<String, Object>> handleVerificationException(ClientRegistrationVerificationException exception) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", exception.getMessage());
        if (exception.getRetryAfterSeconds() > 0) {
            body.put("retryAfterSeconds", exception.getRetryAfterSeconds());
        }
        return ResponseEntity.status(exception.getStatus()).body(body);
    }
}
