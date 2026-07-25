package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Subscription;
import org.matchia.matchiabackend.entity.enums.SubscriptionStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByRequest_Id(Long requestId);
    List<Subscription> findByMarketplace_Id(Long marketplaceId);
    List<Subscription> findByStartDateIsNotNullOrderByExpirationDateDesc();
    List<Subscription> findByStatusAndExpirationDateBetween(
            SubscriptionStatusEnum status,
            LocalDate start,
            LocalDate end
    );
    boolean existsByMarketplace_IdAndStatusAndExpirationDateGreaterThanEqual(
            Long marketplaceId,
            SubscriptionStatusEnum status,
            LocalDate date
    );
}
