package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.entity.Store;
import org.springframework.stereotype.Component;

@Component
public class StoreMapper {
    public StoreDto toDto(Store store) {
        if (store == null) return null;

        StoreDto dto = new StoreDto();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setDescription(store.getDescription());
        dto.setIcon(store.getIcon());
        dto.setStatus(store.getStatus());
        dto.setCreatedAt(store.getCreatedAt());

        if (store.getModuleStores() != null) {
            dto.setModulesCount(store.getModuleStores().size());
        } else {
            dto.setModulesCount(0);
        }

        return dto;
    }

    public Store toEntity(StoreDto dto) {
        if (dto == null) return null;

        Store store = new Store();
        if (dto.getId() != null) store.setId(dto.getId());
        store.setName(dto.getName());
        store.setDescription(dto.getDescription());
        store.setIcon(dto.getIcon());
        store.setStatus(dto.getStatus());

        return store;
    }
}
