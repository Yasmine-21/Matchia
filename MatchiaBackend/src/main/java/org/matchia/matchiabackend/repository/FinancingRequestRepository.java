package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.FinancingRequest;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancingRequestRepository extends JpaRepository<FinancingRequest, Long> {
    @EntityGraph(attributePaths = {"client", "bank", "store", "product", "dealerProduct", "processedBy", "documents"})
    List<FinancingRequest> findByClient_IdOrderByCreatedAtDesc(Long clientId);
    @EntityGraph(attributePaths = {"client", "bank", "store", "product", "dealerProduct", "processedBy", "documents"})
    Optional<FinancingRequest> findByIdAndClient_Id(Long id, Long clientId);
    @EntityGraph(attributePaths = {"client", "bank", "store", "product", "dealerProduct", "processedBy", "documents"})
    Optional<FinancingRequest> findByIdAndBank_Id(Long id, Long bankId);
    @EntityGraph(attributePaths = {"client", "bank", "store", "product", "dealerProduct", "processedBy", "documents"})
    List<FinancingRequest> findByBank_IdAndStore_IdOrderByCreatedAtDesc(Long bankId, Long storeId);
    @EntityGraph(attributePaths = {"client", "bank", "store", "product", "dealerProduct", "processedBy", "documents"})
    List<FinancingRequest> findByBank_IdAndClient_IdOrderByCreatedAtDesc(Long bankId, Long clientId);
    long countByClient_IdAndStatus(Long clientId, FinancingRequestStatusEnum status);
    long countByClient_Id(Long clientId);
}
