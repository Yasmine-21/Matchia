package org.matchia.matchiabackend.dto;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankWithStoresDto {
    private Long id;
    private String name;
    private String slug;
    private String logoUrl;
    private String country;
    private String description;
    private String websiteUrl;
    private Integer establishedYear;
    private String status;
    private Integer totalUsers;
    private String createdAt;
    private String updatedAt;
    private BankBrandingDto branding;

}
