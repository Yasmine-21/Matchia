package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModuleStoreResponseDto {
    private Long id;
    private ModuleDto module;
    private List<ModuleStoreParameterDto> parameters;
    private Boolean actif;
    private Integer ordre;
    private BigDecimal price;
}
