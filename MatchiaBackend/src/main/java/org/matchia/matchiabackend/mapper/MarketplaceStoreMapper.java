package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.MarketplaceStoreDto;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.springframework.stereotype.Component;

@Component
public class MarketplaceStoreMapper {
    public MarketplaceStoreDto toDto(MarketplaceStore entity) {
        if (entity == null) return null;
        return new MarketplaceStoreDto(
            entity.getId(),
            entity.getMarketplace() != null && entity.getMarketplace().getBank() != null
                    ? entity.getMarketplace().getBank().getId()
                    : null,
            entity.getMarketplace() != null ? entity.getMarketplace().getId() : null,
            entity.getStore() != null ? entity.getStore().getId() : null,
            entity.getEnabled(),
            entity.getVisible()
        );
    }
    public MarketplaceStore toEntity(MarketplaceStoreDto dto) {
        if (dto == null) return null;
        MarketplaceStore entity = new MarketplaceStore();
        entity.setId(dto.getId());
        entity.setEnabled(dto.getEnabled());
        entity.setVisible(dto.getVisible());
        return entity;
    }
}
