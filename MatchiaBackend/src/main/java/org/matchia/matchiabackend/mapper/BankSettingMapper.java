package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.BankSettingDto;
import org.matchia.matchiabackend.entity.BankSetting;
import org.springframework.stereotype.Component;

@Component
public class BankSettingMapper {
    public BankSettingDto toDto(BankSetting entity) {
        if (entity == null) return null;
        return new BankSettingDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getSupportEmail(),
            entity.getSupportPhone(),
            entity.getCreatedAt()
        );
    }
    public BankSetting toEntity(BankSettingDto dto) {
        if (dto == null) return null;
        BankSetting entity = new BankSetting();
        entity.setId(dto.getId());
        entity.setSupportEmail(dto.getSupportEmail());
        entity.setSupportPhone(dto.getSupportPhone());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }
}
