package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutSessionRequest {
    private Long requestId;
    private String bankName;
    private BigDecimal amount;
    private String currency;
}
