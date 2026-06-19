package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDto {
    private Long id;
    private Long bankId;
    private String bankName;
    private Long storeId;
    private String storeName;
    private String name;
    private String description;
    private List<ProductParameterValueDto> parameterValues = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
