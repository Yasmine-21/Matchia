package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.CertificateEnvironmentEnum;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;
import org.matchia.matchiabackend.entity.enums.CertificateTypeEnum;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CertificateDto {

    private Long id;
    private String name;
    private CertificateTypeEnum type;
    private Long bankId;
    private String bankName;
    private Long marketplaceId;
    private String marketplaceName;
    private String relatedService;
    private CertificateEnvironmentEnum environment;
    private String serialNumber;
    private String fingerprint;
    private String issuer;
    private LocalDate issueDate;
    private LocalDate expirationDate;
    private Long remainingDays;
    private CertificateStatusEnum status;
    private String revocationReason;
    private boolean automaticRotationEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
