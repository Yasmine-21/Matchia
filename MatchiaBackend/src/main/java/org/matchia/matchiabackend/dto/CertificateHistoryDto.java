package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CertificateHistoryDto {

    private Long id;
    private Long certificateId;
    private String certificateName;
    private String action;
    private String details;
    private CertificateStatusEnum statusAfterAction;
    private String performedBy;
    private LocalDateTime performedAt;
}
