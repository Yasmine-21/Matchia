package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {
            "bank",
            "store",
            "parameterValues",
            "parameterValues.parameterDefinition"
    })
    Optional<Product> findById(Long id);

    @EntityGraph(attributePaths = {
            "bank",
            "store",
            "parameterValues",
            "parameterValues.parameterDefinition"
    })
    List<Product> findByBank_IdOrderByCreatedAtDesc(Long bankId);

    @EntityGraph(attributePaths = {
            "bank",
            "store",
            "parameterValues",
            "parameterValues.parameterDefinition"
    })
    List<Product> findByStore_IdOrderByCreatedAtDesc(Long storeId);
}
