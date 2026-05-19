package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankSettingDto {
    private Long id;
    private Long bankId;
    private String supportEmail;
    private String supportPhone;
    private LocalDateTime createdAt;
}
