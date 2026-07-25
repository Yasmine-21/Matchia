package org.matchia.matchiabackend.dto;

import java.math.BigDecimal;

/** Revenue from paid TND payments for one calendar month. */
public record MonthlyRevenueDto(String month, BigDecimal revenue, String currency) {
}
