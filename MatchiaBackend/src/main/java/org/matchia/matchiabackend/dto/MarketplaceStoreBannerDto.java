package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Banner data belonging to one marketplace/store assignment. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceStoreBannerDto {
    private Long marketplaceStoreId;
    private Long marketplaceId;
    private Long storeId;
    private String bannerImageUrl;
    private List<BannerImageDto> bannerImages;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BannerImageDto {
        private Long id;
        private String imageUrl;
        private Integer displayOrder;
    }
}
