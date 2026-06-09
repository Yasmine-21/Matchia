package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Marketplace;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceRepository extends JpaRepository<Marketplace, Long> {
    boolean existsByBankId(Long bankId);

    @EntityGraph(attributePaths = {
            "bank",
            "marketplaceStores",
            "marketplaceStores.store"
    })
    List<Marketplace> findAll();

    @EntityGraph(attributePaths = {
            "bank",
            "marketplaceStores",
            "marketplaceStores.store"
    })
    Optional<Marketplace> findById(Long id);

    @EntityGraph(attributePaths = {
            "bank",
            "marketplaceStores",
            "marketplaceStores.store"
    })
    Optional<Marketplace> findByBankId(Long bankId);

    @EntityGraph(attributePaths = {
            "bank",
            "marketplaceStores",
            "marketplaceStores.store"
    })
    Optional<Marketplace> findByBank_Slug(String slug);
}
