package org.matchia.matchiabackend.dto;

public record SubscriptionRenewalResponse(Long requestId, Long paymentId, String paymentLink) {
}
