package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductParameterDefinitionRepository extends JpaRepository<ProductParameterDefinition, Long> {

    @EntityGraph(attributePaths = {"store"})
    List<ProductParameterDefinition> findByStoreIdOrderByNameAsc(Long storeId);

    @EntityGraph(attributePaths = {"store"})
    Optional<ProductParameterDefinition> findByIdAndStoreId(Long id, Long storeId);

    boolean existsByStoreIdAndNameIgnoreCase(Long storeId, String name);
}
