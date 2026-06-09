package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentIntentResponse {
    private String clientSecret;
    private Long paymentId;
    private String paymentIntentId;
    private BigDecimal amount;
    private String currency;
    private String status;
}
