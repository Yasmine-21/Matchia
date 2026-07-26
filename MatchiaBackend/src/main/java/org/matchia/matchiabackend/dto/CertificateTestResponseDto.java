package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CertificateTestResponseDto {
    private Long certificateId;
    private boolean passed;
    private String message;
    private LocalDateTime testedAt;
}
