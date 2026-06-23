package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.ProductDto;
import org.matchia.matchiabackend.dto.ProductParameterValueDto;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.ProductParameterValue;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.stream.Collectors;

@Component
public class ProductMapper {

    public ProductDto toDto(Product entity) {
        if (entity == null) {
            return null;
        }

        ProductDto dto = new ProductDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        dto.setPrice(entity.getPrice());
        dto.setImageUrl(entity.getImageUrl());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getBank() != null) {
            dto.setBankId(entity.getBank().getId());
            dto.setBankName(entity.getBank().getName());
        }

        if (entity.getStore() != null) {
            dto.setStoreId(entity.getStore().getId());
            dto.setStoreName(entity.getStore().getName());
        }

        if (entity.getParameterValues() != null) {
            dto.setParameterValues(entity.getParameterValues().stream()
                    .map(this::toParameterValueDto)
                    .collect(Collectors.toList()));
        } else {
            dto.setParameterValues(new ArrayList<>());
        }

        return dto;
    }

    public ProductParameterValueDto toParameterValueDto(ProductParameterValue entity) {
        if (entity == null) {
            return null;
        }

        ProductParameterValueDto dto = new ProductParameterValueDto();
        dto.setId(entity.getId());
        dto.setValue(entity.getValue());

        if (entity.getParameterDefinition() != null) {
            dto.setParameterDefinitionId(entity.getParameterDefinition().getId());
            dto.setParameterName(entity.getParameterDefinition().getName());
        }

        return dto;
    }
}
