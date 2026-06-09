package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceConfigDto {
    private Long bankId;
    private String marketplaceSlug;
    private String marketplaceDescription;
    private String primaryColor;
    private String secondaryColor;
    private String banniereUrl;
    private String bannerImageUrl;
    private BigDecimal totalMonthlyPrice;
    private List<Long> storeIds;
    private List<Long> moduleIds;
    private Map<Long, List<Long>> selectedModulesByStore;
}
