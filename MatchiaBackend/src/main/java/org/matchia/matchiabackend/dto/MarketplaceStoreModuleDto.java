package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceStoreModuleDto {
    private Long id;
    private Long marketplaceStoreId;
    private Long moduleId;
    private Boolean enabled;
    private Boolean visible;
}
