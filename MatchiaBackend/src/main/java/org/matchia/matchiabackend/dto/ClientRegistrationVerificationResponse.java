package org.matchia.matchiabackend.dto;

public record ClientRegistrationVerificationResponse(
        String message,
        long expiresInSeconds,
        long resendAvailableInSeconds
) {
}
