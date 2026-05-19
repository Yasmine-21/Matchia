package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankDto {
    private Long id;
    private String name;
    private String slug;
    private String logoUrl;
    private String country;
    private String description;
    private Integer establishedYear;
    private BankStatusEnum status;
    private LocalDateTime createdAt;

}
