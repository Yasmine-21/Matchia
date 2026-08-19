package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A client financing application. All tenant boundaries are persisted on the request. */
@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "financing_request", indexes = {
        @Index(name = "idx_financing_request_bank_store", columnList = "bank_id,store_id"),
        @Index(name = "idx_financing_request_client", columnList = "client_id")
})
public class FinancingRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "client_id", nullable = false)
    private User client;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bank_id", nullable = false)
    private Bank bank;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "store_id", nullable = false)
    private Store store;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id")
    private Product product;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "dealer_product_id")
    private DealerProduct dealerProduct;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private FinancingRequestStatusEnum status = FinancingRequestStatusEnum.PENDING;

    @Column(precision = 12, scale = 2) private BigDecimal requestedAmount;
    @Column(precision = 12, scale = 2) private BigDecimal monthlyPayment;
    @Column(precision = 12, scale = 2) private BigDecimal downPayment;
    private Integer durationMonths;
    @Column(precision = 7, scale = 4) private BigDecimal annualRate;
    @Column(columnDefinition = "TEXT") private String simulationData;
    @Column(length = 1500) private String processingComment;
    @Column(length = 1500) private String rejectionReason;
    private LocalDateTime processedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "processed_by_id")
    private User processedBy;
    @CreationTimestamp @Column(nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable = false) private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "financingRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinancingRequestDocument> documents = new ArrayList<>();
}
