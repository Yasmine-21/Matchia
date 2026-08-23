package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.DealerProduct;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface DealerProductRepository extends JpaRepository<DealerProduct, Long> {
    @EntityGraph(attributePaths = {"dealer", "store", "parameterValues", "parameterValues.parameterDefinition"})
    List<DealerProduct> findByDealerIdOrderByCreatedAtDesc(Long dealerId);
    @EntityGraph(attributePaths = {"dealer", "store", "parameterValues", "parameterValues.parameterDefinition"})
    Optional<DealerProduct> findByIdAndDealerId(Long id, Long dealerId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from DealerProduct p where p.id = :id")
    Optional<DealerProduct> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
