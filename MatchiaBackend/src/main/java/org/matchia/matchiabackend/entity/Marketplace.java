package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

@Table(name = "marketplace")
public class Marketplace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id", unique=true)
    private Bank bank;

    @OneToMany(mappedBy = "marketplace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private java.util.List<MarketplaceStore> marketplaceStores = new java.util.ArrayList<>();

    private String primaryColor;
    private String secondaryColor;
    private String homepageTitle;
    private String welcomeText;
    @Column(name = "banniere_url")
    private String banniereUrl;
    private String footerText;
    private String logoImageUrl;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalMonthlyPrice;

    @Enumerated(EnumType.STRING)
    private MarketplaceStatusEnum status ;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public String getBannerImageUrl() {
        return banniereUrl;
    }

    public void setBannerImageUrl(String bannerImageUrl) {
        this.banniereUrl = bannerImageUrl;
    }
}
