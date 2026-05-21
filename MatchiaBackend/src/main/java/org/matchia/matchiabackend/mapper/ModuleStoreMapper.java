package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.*;
import org.matchia.matchiabackend.entity.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.stream.Collectors;

@Component
public class ModuleStoreMapper {

    public ModuleStoreResponseDto toDto(ModuleStore entity) {
        if (entity == null) return null;

        ModuleStoreResponseDto dto = new ModuleStoreResponseDto();
        dto.setId(entity.getId());
        dto.setActif(entity.getActif());
        dto.setOrdre(entity.getOrdre());


        // 2. Mapping du Module
        if (entity.getModule() != null) {
            ModuleDto mDto = new ModuleDto();
            mDto.setId(entity.getModule().getId());
            mDto.setName(entity.getModule().getName());
            mDto.setStatus(entity.getModule().getStatus());
            mDto.setCreatedAt(entity.getModule().getCreatedAt());
            dto.setModule(mDto);
        }

        // 3. Mapping des paramètres
        if (entity.getParameters() != null) {
            dto.setParameters(entity.getParameters().stream()
                    .map(p -> new ModuleStoreParameterDto(
                            p.getId(), p.getCode(), p.getName(), p.getType(), p.getRequired()
                    )).collect(Collectors.toList()));
        } else {
            dto.setParameters(new ArrayList<>());
        }

        return dto;
    }
    public StoreDto toStoreDto(Store store) {
        if (store == null) return null;

        StoreDto dto = new StoreDto();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setDescription(store.getDescription());
        dto.setIcon(store.getIcon());
        dto.setStatus(store.getStatus());
        dto.setCreatedAt(store.getCreatedAt());

        return dto;
    }

}