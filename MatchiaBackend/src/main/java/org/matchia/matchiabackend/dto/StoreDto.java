package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreDto {

    private Long id;
    private String name;
    private String description;
    private String icon;
    private StoreStatusEnum status;
    private BigDecimal price;
    private LocalDateTime createdAt;
    private Integer modulesCount;
}
