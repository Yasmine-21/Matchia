package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductParameterDefinitionDto {
    private Long id;
    private Long storeId;
    private String storeName;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
