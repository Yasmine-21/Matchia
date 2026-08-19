package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class FinancingRequestDtos {
    private FinancingRequestDtos() { }

    @Data public static class CreateRequest {
        @NotNull private Long productId;
        /** Identifies a marketplace-published dealer product when the simulation did not originate from a bank product. */
        private Long dealerProductId;
        @NotNull private Long storeId;
        private BigDecimal requestedAmount;
        private BigDecimal monthlyPayment;
        private BigDecimal downPayment;
        private Integer durationMonths;
        private BigDecimal annualRate;
        /** Snapshot supplied by the simulator, retained for audit and display. */
        private String simulationData;
    }

    @Data public static class ProcessRequest {
        @NotNull private FinancingRequestStatusEnum status;
        private String comment;
        private String rejectionReason;
    }

    @Data public static class DocumentRequirementDto {
        private String documentType;
        private String label;
        private boolean required;
    }

    @Data public static class DocumentDto {
        private Long id;
        private String documentType;
        private String originalFilename;
        private String contentType;
        private Long fileSize;
        private LocalDateTime uploadedAt;
    }

    @Data public static class SummaryDto {
        private Long id;
        private String reference;
        private Long clientId;
        private String clientName;
        private Long productId;
        private boolean dealerProduct;
        private String productName;
        private String productImageUrl;
        private Long storeId;
        private String storeName;
        private BigDecimal productPrice;
        private BigDecimal requestedAmount;
        private BigDecimal monthlyPayment;
        private FinancingRequestStatusEnum status;
        private LocalDateTime createdAt;
    }

    @Data public static class DetailDto extends SummaryDto {
        private Long bankId;
        private String bankName;
        private BigDecimal downPayment;
        private Integer durationMonths;
        private BigDecimal annualRate;
        private String simulationData;
        private String processingComment;
        private String rejectionReason;
        private LocalDateTime processedAt;
        private String processedByName;
        private ClientProfileDto client;
        private List<DocumentDto> documents;
    }

    @Data public static class DashboardDto {
        private long total;
        private long pending;
        private long accepted;
        private long rejected;
        private List<SummaryDto> recent;
    }
}
