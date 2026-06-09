package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModuleStoreRequest {
    private StoreDto store;
    private ModuleDto module;
    private Boolean actif = true;
    private Integer ordre = 0;
    private BigDecimal price;
    private List<ModuleStoreParameter> parameters;
}
