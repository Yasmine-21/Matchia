package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ProductPublicationRequest;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductPublicationRequestRepository extends JpaRepository<ProductPublicationRequest, Long> {
    @EntityGraph(attributePaths = {"product", "product.parameterValues", "product.parameterValues.parameterDefinition", "dealer", "bank", "marketplace", "store", "partnership"})
    List<ProductPublicationRequest> findByDealerIdOrderBySubmittedAtDesc(Long dealerId);
    @EntityGraph(attributePaths = {"product", "product.parameterValues", "product.parameterValues.parameterDefinition", "dealer", "bank", "marketplace", "store", "partnership"})
    List<ProductPublicationRequest> findByBankIdOrderBySubmittedAtDesc(Long bankId);
    Optional<ProductPublicationRequest> findByProductIdAndBankIdAndStoreId(Long productId, Long bankId, Long storeId);
    @EntityGraph(attributePaths = {"product", "product.parameterValues", "product.parameterValues.parameterDefinition", "dealer", "bank", "marketplace", "store", "partnership"})
    List<ProductPublicationRequest> findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(Long marketplaceId, Long storeId, ProductPublicationStatusEnum status);
}
