package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

@Table(name = "bank_branding")
public class BankBranding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id", unique=true)
    private Bank bank;


    private String primaryColor;
    private String secondaryColor;
    private String homepageTitle;
    private String welcomeText;
    private String bannerImageUrl;
    private String footerText;
    private String logoImageUrl;

    @CreationTimestamp
    private LocalDateTime createdAt;



}