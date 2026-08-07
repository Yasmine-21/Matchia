package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.DealerBankPartnership;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DealerBankPartnershipRepository extends JpaRepository<DealerBankPartnership, Long> {
    @EntityGraph(attributePaths = {"dealer", "bank", "store"}) List<DealerBankPartnership> findByDealerIdOrderByRequestDateDesc(Long dealerId);
    @EntityGraph(attributePaths = {"dealer", "bank", "store"}) List<DealerBankPartnership> findByBankIdOrderByRequestDateDesc(Long bankId);
    Optional<DealerBankPartnership> findByDealerIdAndBankIdAndStoreId(Long dealerId, Long bankId, Long storeId);
    boolean existsByDealerIdAndBankIdAndStoreIdAndStatusIn(Long dealerId, Long bankId, Long storeId, Collection<DealerPartnershipStatusEnum> statuses);
}
