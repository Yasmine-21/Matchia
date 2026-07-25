package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.SubscriptionStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionDto {
    private Long subscriptionId;
    private Long requestId;
    private Long paymentId;
    private String bankName;
    private String bankLogoUrl;
    private String marketplaceSlug;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime paidAt;
    private LocalDate startDate;
    private LocalDate expirationDate;
    private Long daysRemaining;
    private SubscriptionStatusEnum status;
    private boolean renewalEligible;
    private boolean renewalPending;
    private List<PaidSubscriptionDto.PaidSubscriptionStoreDto> stores = new ArrayList<>();
}
