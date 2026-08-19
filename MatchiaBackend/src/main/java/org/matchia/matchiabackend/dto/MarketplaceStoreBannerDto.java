package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Banner data belonging to one marketplace/store assignment. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceStoreBannerDto {
    private Long marketplaceStoreId;
    private Long marketplaceId;
    private Long storeId;
    private String bannerImageUrl;
}
