package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "product_publication_request", uniqueConstraints =
        @UniqueConstraint(columnNames = {"dealer_product_id", "bank_id", "store_id"}))
public class ProductPublicationRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "dealer_product_id", nullable = false) private DealerProduct product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "dealer_id", nullable = false) private Dealer dealer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "partnership_id", nullable = false) private DealerBankPartnership partnership;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "bank_id", nullable = false) private Bank bank;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "marketplace_id", nullable = false) private Marketplace marketplace;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "store_id", nullable = false) private Store store;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ProductPublicationStatusEnum status;
    @Column(name = "rejection_reason", length = 1000) private String rejectionReason;
    @Column(nullable = false) private Boolean active;
    @CreationTimestamp @Column(name = "submitted_at", updatable = false) private LocalDateTime submittedAt;
    @Column(name = "processed_at") private LocalDateTime processedAt;
}
