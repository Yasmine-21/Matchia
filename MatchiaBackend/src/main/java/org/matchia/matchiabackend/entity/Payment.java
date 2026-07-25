package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentTypeEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private Request request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    /** Approval request that authorized this renewal payment; null for initial payments. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renewal_request_id")
    private Request renewalRequest;

    @Column(unique = true)
    private String stripeSessionId;

    private String stripePaymentIntentId;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatusEnum status = PaymentStatusEnum.pending;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentTypeEnum paymentType = PaymentTypeEnum.INITIAL;

    /** The previously paid subscription payment renewed by this payment. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renewed_payment_id")
    private Payment renewedPayment;

    @Column(length = 2048)
    private String checkoutUrl;

    private String bankName;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime paidAt;
}
