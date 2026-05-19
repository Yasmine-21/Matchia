package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankBrandingDto {

    private Long id;

    private Long bankId;

    private String primaryColor;

    private String secondaryColor;

    private String homepageTitle;

    private String welcomeText;

    private String bannerImageUrl;

    private String footerText;

    private String logoImageUrl;

    private LocalDateTime createdAt;
}
