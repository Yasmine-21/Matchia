package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestDto {
    private Long id;
    private Long bankId;
    private RequestTypeEnum requestType;
    private RequestStatusEnum status;
    private String priority;
    private String rejectionReason;
    private String createdBy;
    private String bankName;
    private String bankEmail;
    private String logoUrl;
    private String country;
    private String website;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String contactImageUrl;
    private String adminContactName;
    private String adminContactEmail;
    private String adminContactPhone;
    private String description;
    private String bankDescription;
    private Integer establishmentYear;
    @NotBlank
    @Pattern(regexp = "^[a-z0-9-]+$")
    private String marketplaceSlug;
    @Size(max = 500)
    private String marketplaceDescription;
    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String primaryColor;
    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String secondaryColor;
    private String banniereUrl;
    private String selectedStores;
    private String selectedModules;
    private List<Long> storeIds;
    private List<Long> moduleIds;
    private List<RequestStoreSelectionDto> selectedStoreDetails;
    private Double totalAmount;
    private Double totalMonthlyPrice;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
