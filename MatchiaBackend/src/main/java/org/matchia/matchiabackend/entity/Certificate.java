package org.matchia.matchiabackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.CertificateEnvironmentEnum;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;
import org.matchia.matchiabackend.entity.enums.CertificateTypeEnum;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CertificateTypeEnum type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id")
    private Bank bank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marketplace_id")
    private Marketplace marketplace;

    @Column(name = "related_service", nullable = false, length = 255)
    private String relatedService;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateEnvironmentEnum environment;

    @Column(name = "serial_number", length = 255)
    private String serialNumber;

    @Column(length = 512)
    private String fingerprint;

    @Column(length = 255)
    private String issuer;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CertificateStatusEnum status;

    @Column(name = "revocation_reason", length = 1000)
    private String revocationReason;

    @Column(name = "automatic_rotation_enabled", nullable = false)
    private boolean automaticRotationEnabled;

    @Column(name = "secure_private_key_reference", nullable = false, length = 512)
    private String securePrivateKeyReference;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
