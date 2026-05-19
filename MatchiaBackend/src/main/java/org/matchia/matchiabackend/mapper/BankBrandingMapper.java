package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.BankBrandingDto;
import org.matchia.matchiabackend.entity.BankBranding;
import org.springframework.stereotype.Component;

@Component
public class BankBrandingMapper {
    public BankBrandingDto toDto(BankBranding entity) {
        if (entity == null) return null;
        return new BankBrandingDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getPrimaryColor(),
            entity.getSecondaryColor(),
            entity.getHomepageTitle(),
            entity.getWelcomeText(),
            entity.getBannerImageUrl(),
            entity.getFooterText(),
            entity.getLogoImageUrl(),
            entity.getCreatedAt()
        );
    }
    public BankBranding toEntity(BankBrandingDto dto) {
        if (dto == null) return null;
        BankBranding entity = new BankBranding();
        entity.setId(dto.getId());
        entity.setPrimaryColor(dto.getPrimaryColor());
        entity.setSecondaryColor(dto.getSecondaryColor());
        entity.setHomepageTitle(dto.getHomepageTitle());
        entity.setWelcomeText(dto.getWelcomeText());
        entity.setBannerImageUrl(dto.getBannerImageUrl());
        entity.setFooterText(dto.getFooterText());
        entity.setLogoImageUrl(dto.getLogoImageUrl());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }
}
