package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.CertificateEnvironmentEnum;
import org.matchia.matchiabackend.entity.enums.CertificateTypeEnum;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CertificateRequestDto {

    @NotBlank
    private String name;

    @NotNull
    private CertificateTypeEnum type;

    private String targetType;

    private Long bankId;

    private Long marketplaceId;

    @NotBlank
    private String relatedService;

    @NotNull
    private CertificateEnvironmentEnum environment;

    private String serialNumber;

    private String fingerprint;

    private String issuer;

    private LocalDate issueDate;

    private LocalDate expirationDate;

    private Boolean automaticRotationEnabled;
}
