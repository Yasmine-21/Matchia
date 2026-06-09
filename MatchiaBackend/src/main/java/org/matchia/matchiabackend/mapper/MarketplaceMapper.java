package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MarketplaceMapper {
    public MarketplaceDto toDto(Marketplace entity) {
        if (entity == null) return null;
        List<MarketplaceDto.MarketplaceStoreDetailDto> stores = toStoreDetails(entity.getMarketplaceStores());
        return new MarketplaceDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getBank() != null ? entity.getBank().getName() : null,
            entity.getBank() != null ? entity.getBank().getSlug() : null,
            entity.getBank() != null ? entity.getBank().getLogoUrl() : null,
            entity.getBank() != null ? entity.getBank().getEmail() : null,
            entity.getBank() != null ? entity.getBank().getCountry() : null,
            entity.getBank() != null ? entity.getBank().getWebsiteUrl() : null,
            entity.getBank() != null ? entity.getBank().getDescription() : null,
            entity.getBank() != null ? entity.getBank().getEstablishedYear() : null,
            entity.getPrimaryColor(),
            entity.getSecondaryColor(),
            entity.getHomepageTitle(),
            entity.getWelcomeText(),
            entity.getBanniereUrl(),
            entity.getBannerImageUrl(),
            entity.getFooterText(),
            entity.getLogoImageUrl(),
            entity.getTotalMonthlyPrice(),
            entity.getStatus(),
            entity.getCreatedAt(),
            stores.size(),
            stores
        );
    }

    private List<MarketplaceDto.MarketplaceStoreDetailDto> toStoreDetails(List<MarketplaceStore> marketplaceStores) {
        if (marketplaceStores == null) return List.of();

        return marketplaceStores.stream()
            .map((marketplaceStore) -> new MarketplaceDto.MarketplaceStoreDetailDto(
                marketplaceStore.getId(),
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getName() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getDescription() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getBanniereUrl() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getPrice() : null,
                marketplaceStore.getEnabled(),
                marketplaceStore.getVisible(),
                toModuleDetails(marketplaceStore.getMarketplaceStoreModules())
            ))
            .toList();
    }

    private List<MarketplaceDto.MarketplaceModuleDetailDto> toModuleDetails(List<MarketplaceStoreModule> marketplaceStoreModules) {
        if (marketplaceStoreModules == null) return List.of();

        return marketplaceStoreModules.stream()
            .map((marketplaceStoreModule) -> new MarketplaceDto.MarketplaceModuleDetailDto(
                marketplaceStoreModule.getId(),
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getId() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getName() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getCategory() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getPrice() : null,
                marketplaceStoreModule.getEnabled(),
                marketplaceStoreModule.getVisible()
            ))
            .toList();
    }

    public Marketplace toEntity(MarketplaceDto dto) {
        if (dto == null) return null;
        Marketplace entity = new Marketplace();
        entity.setId(dto.getId());
        entity.setPrimaryColor(dto.getPrimaryColor());
        entity.setSecondaryColor(dto.getSecondaryColor());
        entity.setHomepageTitle(dto.getHomepageTitle());
        entity.setWelcomeText(dto.getWelcomeText());
        entity.setBanniereUrl(hasText(dto.getBanniereUrl()) ? dto.getBanniereUrl() : dto.getBannerImageUrl());
        entity.setFooterText(dto.getFooterText());
        entity.setLogoImageUrl(dto.getLogoImageUrl());
        entity.setTotalMonthlyPrice(dto.getTotalMonthlyPrice());
        entity.setStatus(dto.getStatus());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
