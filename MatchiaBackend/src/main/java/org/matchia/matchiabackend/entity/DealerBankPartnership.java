package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipInitiatorEnum;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "dealer_bank_partnership", uniqueConstraints =
        @UniqueConstraint(columnNames = {"dealer_id", "bank_id", "store_id"}))
public class DealerBankPartnership {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "dealer_id", nullable = false) private Dealer dealer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "bank_id", nullable = false) private Bank bank;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "store_id", nullable = false) private Store store;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private DealerPartnershipStatusEnum status;
    @Enumerated(EnumType.STRING) @Column(name = "initiated_by", length = 20) private PartnershipInitiatorEnum initiatedBy;
    @Column(length = 1000) private String message;
    @Column(name = "rejection_reason", length = 1000) private String rejectionReason;
    @CreationTimestamp @Column(name = "request_date", updatable = false) private LocalDateTime requestDate;
    @Column(name = "processing_date") private LocalDateTime processingDate;
    @Column(name = "approved_at") private LocalDateTime approvedAt;
    @Column(name = "rejected_at") private LocalDateTime rejectedAt;
    @UpdateTimestamp @Column(name = "updated_at") private LocalDateTime updatedAt;
}
