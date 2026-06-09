package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestStoreSelectionDto {
    private Long id;
    private Long storeId;
    private String storeName;
    private String storeDescription;
    private BigDecimal storePrice;
    private List<RequestModuleSelectionDto> modules = new ArrayList<>();
}
