package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.matchia.matchiabackend.entity.enums.PartnershipBillingModelEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipCommissionTypeEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class PartnershipContractDtos {
    private PartnershipContractDtos() {}

    public record UpsertRequest(
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            boolean commissionApplicable,
            PartnershipCommissionTypeEnum commissionType,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal commissionValue,
            @Size(max = 6000) String contractTerms,
            @Size(max = 4000) String terminationConditions
    ) {
        @AssertTrue(message = "La date de fin doit etre posterieure a la date de debut.")
        public boolean isDateRangeValid() {
            return startDate == null || endDate == null || endDate.isAfter(startDate);
        }
    }

    public record RejectionRequest(@NotNull @Size(min = 3, max = 1000) String reason) {}

    public record View(
            Long id,
            String contractNumber,
            Long partnershipId,
            Long dealerId,
            String dealerName,
            Long bankId,
            String bankName,
            Long storeId,
            String storeName,
            PartnershipContractStatusEnum status,
            LocalDate startDate,
            LocalDate endDate,
            PartnershipBillingModelEnum billingModel,
            BigDecimal partnershipFee,
            boolean commissionApplicable,
            PartnershipCommissionTypeEnum commissionType,
            BigDecimal commissionValue,
            String contractTerms,
            String terminationConditions,
            LocalDateTime dealerAcceptedAt,
            LocalDateTime bankAcceptedAt,
            LocalDateTime sentAt,
            String rejectionReason,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
