package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.DealerAccountRequest;
import org.matchia.matchiabackend.entity.enums.DealerRequestStatusEnum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public interface DealerAccountRequestRepository extends JpaRepository<DealerAccountRequest, Long>, JpaSpecificationExecutor<DealerAccountRequest> {
    @Override
    @EntityGraph(attributePaths = {"store", "documentUrls"})
    Page<DealerAccountRequest> findAll(Specification<DealerAccountRequest> specification, Pageable pageable);

    @EntityGraph(attributePaths = {"store", "documentUrls"})
    Page<DealerAccountRequest> findByStatusAndCompanyNameContainingIgnoreCaseAndSubmittedAtBetween(
            DealerRequestStatusEnum status, String search, LocalDateTime from, LocalDateTime to, Pageable pageable);
    @EntityGraph(attributePaths = {"store", "documentUrls"})
    Page<DealerAccountRequest> findByCompanyNameContainingIgnoreCaseAndSubmittedAtBetween(
            String search, LocalDateTime from, LocalDateTime to, Pageable pageable);
    boolean existsByEmailIgnoreCaseAndStatus(String email, DealerRequestStatusEnum status);
}
