package org.matchia.matchiabackend.dto;

public record JoinEmailVerificationSendResponse(
        String message,
        long expiresInSeconds,
        long resendAvailableInSeconds
) {
}
