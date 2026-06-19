package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.ProductParameterDefinitionDto;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionRequestDto;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.springframework.stereotype.Component;

@Component
public class ProductParameterDefinitionMapper {

    public ProductParameterDefinitionDto toDto(ProductParameterDefinition entity) {
        if (entity == null) {
            return null;
        }

        ProductParameterDefinitionDto dto = new ProductParameterDefinitionDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getStore() != null) {
            dto.setStoreId(entity.getStore().getId());
            dto.setStoreName(entity.getStore().getName());
        }

        return dto;
    }

    public ProductParameterDefinition toEntity(ProductParameterDefinitionRequestDto dto) {
        if (dto == null) {
            return null;
        }

        ProductParameterDefinition entity = new ProductParameterDefinition();
        entity.setName(dto.getName());
        return entity;
    }
}
