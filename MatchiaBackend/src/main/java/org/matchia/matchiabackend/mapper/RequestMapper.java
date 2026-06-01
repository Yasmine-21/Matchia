package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.Store;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class RequestMapper {

    // Entity -> DTO
    public RequestDto toDto(Request entity) {
        if (entity == null) return null;

        RequestDto dto = new RequestDto();
        dto.setId(entity.getId());
        dto.setBankId(entity.getBank() != null ? entity.getBank().getId() : null);
        dto.setRequestType(entity.getRequestType());
        dto.setStatus(entity.getStatus());
        dto.setPriority(entity.getPriority());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setBankName(entity.getBankName());
        dto.setBankEmail(entity.getBankEmail());
        dto.setLogoUrl(entity.getLogoUrl());
        dto.setCountry(entity.getCountry());
        dto.setWebsite(entity.getWebsite());
        dto.setContactName(entity.getContactName());
        dto.setContactEmail(entity.getContactEmail());
        dto.setContactPhone(entity.getContactPhone());
        dto.setDescription(entity.getDescription());
        dto.setSelectedStores(entity.getSelectedStores());
        dto.setSelectedModules(entity.getSelectedModules());
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setCreatedAt(entity.getCreatedAt());

        // Extraire les IDs des relations ManyToMany
        if (entity.getStores() != null) {
            List<Long> storeIds = entity.getStores().stream()
                    .map(Store::getId)
                    .collect(Collectors.toList());
            dto.setStoreIds(storeIds);
        }

        if (entity.getModules() != null) {
            List<Long> moduleIds = entity.getModules().stream()
                    .map(Module::getId)
                    .collect(Collectors.toList());
            dto.setModuleIds(moduleIds);
        }

        return dto;
    }

    // DTO -> Entity (utilisé pour la mise à jour)
    public Request toEntity(RequestDto dto) {
        if (dto == null) return null;

        Request entity = new Request();
        entity.setRequestType(dto.getRequestType());
        entity.setStatus(dto.getStatus());
        entity.setPriority(dto.getPriority());
        entity.setCreatedBy(dto.getCreatedBy());
        entity.setBankName(dto.getBankName());
        entity.setBankEmail(dto.getBankEmail());
        entity.setLogoUrl(dto.getLogoUrl());
        entity.setCountry(dto.getCountry());
        entity.setWebsite(dto.getWebsite());
        entity.setContactName(dto.getContactName());
        entity.setContactEmail(dto.getContactEmail());
        entity.setContactPhone(dto.getContactPhone());
        entity.setDescription(dto.getDescription());
        entity.setSelectedStores(dto.getSelectedStores());
        entity.setSelectedModules(dto.getSelectedModules());
        entity.setTotalAmount(dto.getTotalAmount());
        // bank, stores, modules → gérés dans le service
        return entity;
    }
}