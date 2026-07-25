package org.matchia.matchiabackend.dto;

import java.time.LocalDate;

/** Dashboard alert for an active paid subscription that is close to its expiration date. */
public record SubscriptionExpiryAlertDto(
        Long subscriptionId,
        String bankName,
        String marketplaceSlug,
        LocalDate expirationDate,
        long daysRemaining,
        String alertLevel
) {
}
