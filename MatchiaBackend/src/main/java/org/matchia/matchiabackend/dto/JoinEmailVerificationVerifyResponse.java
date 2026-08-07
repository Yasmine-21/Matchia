package org.matchia.matchiabackend.dto;

public record JoinEmailVerificationVerifyResponse(
        boolean verified,
        String verificationToken,
        String message
) {
}
