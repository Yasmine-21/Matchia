package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.*;
import org.matchia.matchiabackend.entity.enums.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class DealerDtos {
    private DealerDtos() {}

    public record RegistrationRequest(
            @NotBlank String companyName,
            @NotBlank String registrationNumber,
            @NotBlank String address,
            @NotBlank String contactPerson,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "^[+0-9 ()-]{8,20}$") String phone,
            @NotNull Long storeId
    ) {}

    public record DealerView(Long id, String companyName, String registrationNumber, String address,
                             String contactPerson, String email, String phone, String logoUrl,
                             Long storeId, String storeName, DealerStatusEnum status, LocalDateTime createdAt) {}

    public record AccountRequestView(Long id, String companyName, String registrationNumber, String address,
                                     String contactPerson, String email, String phone, String logoUrl,
                                     Long storeId, String storeName, List<String> documentUrls,
                                     DealerRequestStatusEnum status, String rejectionReason,
                                     LocalDateTime submittedAt, LocalDateTime processedAt) {}

    public record DecisionRequest(String reason) {}
    public record PartnershipCreate(@NotNull Long bankId, @NotNull Long storeId, @Size(max = 1000) String message) {}
    public record BankOption(Long bankId, String bankName, String bankLogoUrl, Long marketplaceId,
                             List<StoreOption> stores) {}
    public record StoreOption(Long storeId, String storeName, String description) {}
    public record PartnershipView(Long id, DealerView dealer, Long bankId, String bankName, Long storeId,
                                  String storeName, DealerPartnershipStatusEnum status, String message,
                                  String rejectionReason, LocalDateTime requestDate, LocalDateTime processingDate) {}

    public record ParameterValue(@NotNull Long definitionId, String name, @Size(max = 2000) String value) {}
    public record ProductUpsert(@NotNull Long storeId, @NotBlank String name, @Size(max = 3000) String description,
                                @NotNull @DecimalMin("0.0") BigDecimal price,
                                @Size(max = 3000) String eligibilityConditions,
                                DealerProductStatusEnum status, List<ParameterValue> parameterValues) {}
    public record ProductView(Long id, Long dealerId, String dealerName, Long storeId, String storeName,
                              String name, String description, BigDecimal price, String imageUrl,
                              String eligibilityConditions, DealerProductStatusEnum status,
                              List<ParameterValue> parameterValues, LocalDateTime createdAt, LocalDateTime updatedAt) {}
    public record PublicationCreate(@NotNull Long productId, @NotNull Long partnershipId) {}
    public record PublicationView(Long id, ProductView product, Long dealerId, String dealerName,
                                  Long bankId, String bankName, Long marketplaceId, Long storeId, String storeName,
                                  ProductPublicationStatusEnum status, boolean active, String rejectionReason,
                                  LocalDateTime submittedAt, LocalDateTime processedAt) {}
    public record Dashboard(long products, long activePartnerships, long pendingPartnerships,
                            long pendingPublications, long approvedPublications) {}
}
