package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.*;
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
    private String createdBy;
    private String bankName;
    private String bankEmail;
    private String logoUrl;
    private String country;
    private String website;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String description;
    private String selectedStores;
    private String selectedModules;
    private List<Long> storeIds;
    private List<Long> moduleIds;
    private Double totalAmount;
    private LocalDateTime createdAt;
}
