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
    private String email;
    private String logoUrl;
    private String country;
    private String description;
    private String websiteUrl;
    private Integer establishedYear;
    private Integer establishmentYear;
    private BankStatusEnum status;
    private Integer totalUsers;
    private Integer assignedStoresCount;
    private LocalDateTime createdAt;

}
