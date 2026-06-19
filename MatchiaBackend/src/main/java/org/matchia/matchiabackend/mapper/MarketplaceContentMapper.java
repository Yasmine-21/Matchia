package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.MarketplaceContentDto;
import org.matchia.matchiabackend.entity.MarketplaceContent;
import org.matchia.matchiabackend.entity.Store;
import org.springframework.stereotype.Component;

@Component
public class MarketplaceContentMapper {

    public MarketplaceContentDto toDto(MarketplaceContent entity) {
        if (entity == null) {
            return null;
        }

        return new MarketplaceContentDto(
                entity.getId(),
                entity.getMarketplace() != null ? entity.getMarketplace().getId() : null,
                entity.getStore() != null ? entity.getStore().getId() : null,
                entity.getStore() != null ? entity.getStore().getName() : null,
                entity.getTitle(),
                entity.getDescription(),
                entity.getImageUrl(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public MarketplaceContent toEntity(MarketplaceContentDto dto) {
        if (dto == null) {
            return null;
        }

        MarketplaceContent entity = new MarketplaceContent();
        entity.setId(dto.getId());
        entity.setTitle(dto.getTitle());
        entity.setDescription(dto.getDescription());
        entity.setImageUrl(dto.getImageUrl());
        entity.setStatus(dto.getStatus());

        if (dto.getStoreId() != null) {
            Store store = new Store();
            store.setId(dto.getStoreId());
            entity.setStore(store);
        }

        return entity;
    }
}
