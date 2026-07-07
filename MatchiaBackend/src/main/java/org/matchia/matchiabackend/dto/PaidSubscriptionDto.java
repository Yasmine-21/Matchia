package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaidSubscriptionDto {
    private Long paymentId;
    private Long requestId;
    private String bankName;
    private String bankLogoUrl;
    private String marketplaceSlug;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime paidAt;
    private List<PaidSubscriptionStoreDto> stores = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaidSubscriptionStoreDto {
        private Long storeId;
        private String storeName;
        private String storeDescription;
        private BigDecimal storePrice;
        private List<PaidSubscriptionModuleDto> modules = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaidSubscriptionModuleDto {
        private Long moduleId;
        private String moduleName;
        private String moduleDescription;
        private String moduleCategory;
        private BigDecimal modulePrice;
    }
}
