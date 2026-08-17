package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.PartnershipBillingModelEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipCommissionTypeEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "partnership_contract")
public class PartnershipContract {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_number", nullable = false, unique = true, length = 80)
    private String contractNumber;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partnership_id", nullable = false, unique = true)
    private DealerBankPartnership partnership;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dealer_id", nullable = false)
    private Dealer dealer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_id", nullable = false)
    private Bank bank;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PartnershipContractStatusEnum status;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_model", nullable = false, length = 20)
    private PartnershipBillingModelEnum billingModel = PartnershipBillingModelEnum.FREE;

    @Column(name = "commission_applicable", nullable = false)
    private Boolean commissionApplicable = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "commission_type", length = 30)
    private PartnershipCommissionTypeEnum commissionType;

    @Column(name = "commission_value", precision = 14, scale = 4)
    private BigDecimal commissionValue;

    @Column(name = "contract_terms", length = 6000)
    private String contractTerms;

    @Column(name = "termination_conditions", length = 4000)
    private String terminationConditions;

    @Column(name = "dealer_accepted_at")
    private LocalDateTime dealerAcceptedAt;

    @Column(name = "bank_accepted_at")
    private LocalDateTime bankAcceptedAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
