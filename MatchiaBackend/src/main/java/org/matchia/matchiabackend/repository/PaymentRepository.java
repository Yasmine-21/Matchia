package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByStripeSessionId(String stripeSessionId);
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);
    Optional<Payment> findTopByRequest_IdOrderByCreatedAtDesc(Long requestId);
    Optional<Payment> findByRenewalRequest_Id(Long renewalRequestId);
    Optional<Payment> findTopByRenewedPayment_IdAndStatusOrderByCreatedAtDesc(Long renewedPaymentId, PaymentStatusEnum status);
    Optional<Payment> findTopBySubscription_IdAndStatusAndPaymentTypeOrderByCreatedAtDesc(
            Long subscriptionId,
            PaymentStatusEnum status,
            org.matchia.matchiabackend.entity.enums.PaymentTypeEnum paymentType
    );
    Optional<Payment> findTopBySubscription_IdAndStatusOrderByPaidAtDesc(Long subscriptionId, PaymentStatusEnum status);
    List<Payment> findByRequest_IdOrderByCreatedAtDesc(Long requestId);
    List<Payment> findByStatusOrderByPaidAtDesc(PaymentStatusEnum status);
    @Query("""
            SELECT payment FROM Payment payment
            WHERE payment.status = :status
              AND payment.paidAt IS NOT NULL
              AND NOT EXISTS (
                  SELECT renewal.id FROM Payment renewal
                  WHERE renewal.renewedPayment = payment
                    AND renewal.status = :status
              )
            ORDER BY payment.paidAt DESC
            """)
    List<Payment> findUnrenewedPaidSubscriptions(@Param("status") PaymentStatusEnum status);
    List<Payment> findTop10ByStatusOrderByPaidAtDesc(PaymentStatusEnum status);
    List<Payment> findByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThan(
            PaymentStatusEnum status,
            LocalDateTime start,
            LocalDateTime end
    );
    long countByStatus(PaymentStatusEnum status);
}
