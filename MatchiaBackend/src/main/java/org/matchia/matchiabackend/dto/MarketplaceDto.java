package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceDto {

    private Long id;

    private Long bankId;

    private String bankName;

    private String bankSlug;

    private String bankLogoUrl;

    private String bankEmail;

    private String bankCountry;

    private String bankWebsiteUrl;

    private String bankDescription;

    private Integer bankEstablishedYear;

    private String primaryColor;

    private String secondaryColor;

    private String homepageTitle;

    private String welcomeText;

    private String banniereUrl;

    private String bannerImageUrl;

    private String footerText;

    private String logoImageUrl;

    private BigDecimal totalMonthlyPrice;

    private MarketplaceStatusEnum status;

    private LocalDateTime createdAt;

    private Integer assignedStoresCount;

    private List<MarketplaceStoreDetailDto> stores;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketplaceStoreDetailDto {
        private Long id;
        private Long storeId;
        private String name;
        private String description;
        private String banniereUrl;
        private BigDecimal price;
        private Boolean enabled;
        private Boolean visible;
        private List<MarketplaceModuleDetailDto> modules;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketplaceModuleDetailDto {
        private Long id;
        private Long moduleId;
        private String name;
        private String category;
        private BigDecimal price;
        private Boolean enabled;
        private Boolean visible;
    }
}
