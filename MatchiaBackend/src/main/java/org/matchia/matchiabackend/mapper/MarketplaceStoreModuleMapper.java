package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.MarketplaceStoreModuleDto;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.springframework.stereotype.Component;

@Component
public class MarketplaceStoreModuleMapper {
    public MarketplaceStoreModuleDto toDto(MarketplaceStoreModule entity) {
        if (entity == null) return null;
        return new MarketplaceStoreModuleDto(
            entity.getId(),
            entity.getMarketplaceStore() != null ? entity.getMarketplaceStore().getId() : null,
            entity.getModule() != null ? entity.getModule().getId() : null,
            entity.getEnabled(),
            entity.getVisible()
        );
    }
    public MarketplaceStoreModule toEntity(MarketplaceStoreModuleDto dto) {
        if (dto == null) return null;
        MarketplaceStoreModule entity = new MarketplaceStoreModule();
        entity.setId(dto.getId());
        entity.setEnabled(dto.getEnabled());
        entity.setVisible(dto.getVisible());
        return entity;
    }
}
