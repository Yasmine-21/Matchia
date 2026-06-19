package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.ContentDto;
import org.matchia.matchiabackend.entity.Content;
import org.matchia.matchiabackend.entity.Store;
import org.springframework.stereotype.Component;

@Component
public class ContentMapper {

    public ContentDto toDto(Content entity) {
        if (entity == null) {
            return null;
        }

        return new ContentDto(
                entity.getId(),
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

    public Content toEntity(ContentDto dto) {
        if (dto == null) {
            return null;
        }

        Content entity = new Content();
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
