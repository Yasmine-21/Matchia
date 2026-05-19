package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankStoreDto {
    private Long id;
    private Long bankId;
    private Long storeId;
    private Boolean enabled;
    private Boolean visible;
}
