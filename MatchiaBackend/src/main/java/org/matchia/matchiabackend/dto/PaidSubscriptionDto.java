package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaidSubscriptionDto {
    private Long paymentId;
    private Long requestId;
    private String bankName;
    private String bankLogoUrl;
    private String marketplaceSlug;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime paidAt;
}
