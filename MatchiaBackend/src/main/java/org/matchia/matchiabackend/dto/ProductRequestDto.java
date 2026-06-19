package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestDto {
    private Long bankId;
    private Long storeId;
    private String name;
    private String description;
    private List<ProductParameterValueRequestDto> parameterValues = new ArrayList<>();
}
