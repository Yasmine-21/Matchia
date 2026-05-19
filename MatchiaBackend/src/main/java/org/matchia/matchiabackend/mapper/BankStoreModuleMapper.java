package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.BankStoreModuleDto;
import org.matchia.matchiabackend.entity.BankStoreModule;
import org.springframework.stereotype.Component;

@Component
public class BankStoreModuleMapper {
    public BankStoreModuleDto toDto(BankStoreModule entity) {
        if (entity == null) return null;
        return new BankStoreModuleDto(
            entity.getId(),
            entity.getBankStore() != null ? entity.getBankStore().getId() : null,
            entity.getModule() != null ? entity.getModule().getId() : null,
            entity.getEnabled(),
            entity.getVisible()
        );
    }
    public BankStoreModule toEntity(BankStoreModuleDto dto) {
        if (dto == null) return null;
        BankStoreModule entity = new BankStoreModule();
        entity.setId(dto.getId());
        entity.setEnabled(dto.getEnabled());
        entity.setVisible(dto.getVisible());
        return entity;
    }
}
