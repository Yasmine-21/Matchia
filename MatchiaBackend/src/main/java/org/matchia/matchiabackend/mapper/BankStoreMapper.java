package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.BankStoreDto;
import org.matchia.matchiabackend.entity.BankStore;
import org.springframework.stereotype.Component;

@Component
public class BankStoreMapper {
    public BankStoreDto toDto(BankStore entity) {
        if (entity == null) return null;
        return new BankStoreDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getStore() != null ? entity.getStore().getId() : null,
            entity.getEnabled(),
            entity.getVisible()
        );
    }
    public BankStore toEntity(BankStoreDto dto) {
        if (dto == null) return null;
        BankStore entity = new BankStore();
        entity.setId(dto.getId());
        entity.setEnabled(dto.getEnabled());
        entity.setVisible(dto.getVisible());
        return entity;
    }
}
