package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestModuleSelectionDto {
    private Long id;
    private Long moduleId;
    private String moduleName;
    private String moduleDescription;
    private BigDecimal modulePrice;
    private String parameters;
}
