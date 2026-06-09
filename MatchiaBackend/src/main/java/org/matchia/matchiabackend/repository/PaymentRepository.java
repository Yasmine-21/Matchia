package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByStripeSessionId(String stripeSessionId);
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);
    Optional<Payment> findTopByRequest_IdOrderByCreatedAtDesc(Long requestId);
    List<Payment> findByRequest_IdOrderByCreatedAtDesc(Long requestId);
    List<Payment> findByStatusOrderByPaidAtDesc(PaymentStatusEnum status);
}
