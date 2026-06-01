package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.springframework.stereotype.Component;



@Component
public class ModuleMapper{
    public ModuleDto toDto(Module entity) {
        if (entity == null) return null;

        ModuleDto dto = new ModuleDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setStatus(entity.getStatus());
        dto.setDescription(entity.getDescription());
        dto.setCategory(entity.getCategory());
        dto.setIcon(entity.getIcon());
        dto.setPrice(entity.getPrice());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    // Conversion DTO -> Entity (Utile pour la création/mise à jour)
    public Module toEntity(ModuleDto dto) {
        if (dto == null) return null;

        Module entity = new Module();
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setStatus(dto.getStatus());
        entity.setCategory(dto.getCategory());
        entity.setIcon(dto.getIcon());
        entity.setPrice(dto.getPrice());
        // createdAt est géré par @CreationTimestamp dans l'entité
        return entity;
    }
}
