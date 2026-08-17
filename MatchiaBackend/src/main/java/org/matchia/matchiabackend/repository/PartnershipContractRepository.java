package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.PartnershipContract;
import org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PartnershipContractRepository extends JpaRepository<PartnershipContract, Long> {
    @EntityGraph(attributePaths = {"partnership", "dealer", "bank", "store"})
    Optional<PartnershipContract> findByPartnershipId(Long partnershipId);

    @EntityGraph(attributePaths = {"partnership", "dealer", "bank", "store"})
    Optional<PartnershipContract> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"partnership", "dealer", "bank", "store"})
    List<PartnershipContract> findByBankIdOrderByCreatedAtDesc(Long bankId);

    @EntityGraph(attributePaths = {"partnership", "dealer", "bank", "store"})
    List<PartnershipContract> findByDealerIdOrderByCreatedAtDesc(Long dealerId);

    @EntityGraph(attributePaths = {"partnership", "dealer", "bank", "store"})
    List<PartnershipContract> findByStatusAndEndDateBefore(PartnershipContractStatusEnum status, LocalDate date);

    boolean existsByPartnershipIdAndStatus(Long partnershipId, PartnershipContractStatusEnum status);
}
