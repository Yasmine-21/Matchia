package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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
    private BigDecimal price;
    private String imageUrl;
    private List<ProductParameterValueDto> parameterValues = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
