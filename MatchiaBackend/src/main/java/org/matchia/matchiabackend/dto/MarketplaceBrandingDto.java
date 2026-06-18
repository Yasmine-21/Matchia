package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceBrandingDto {
    private String primaryColor;
    private String secondaryColor;
    private String homepageTitle;
    private String welcomeText;
    private String footerText;
    private String logoImageUrl;
    private String banniereUrl;
    private String bannerImageUrl;
}
