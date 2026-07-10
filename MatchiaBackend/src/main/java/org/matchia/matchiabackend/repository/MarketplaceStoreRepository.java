package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceStoreRepository extends JpaRepository<MarketplaceStore, Long> {
    long countByMarketplace_Bank_Id(Long bankId);

    @EntityGraph(attributePaths = {
            "store",
            "marketplaceStoreModules",
            "marketplaceStoreModules.module"
    })
    List<MarketplaceStore> findByMarketplace_Id(Long marketplaceId);

    @EntityGraph(attributePaths = {
            "marketplace",
            "store",
            "marketplaceStoreModules",
            "marketplaceStoreModules.module"
    })
    List<MarketplaceStore> findByStore_Id(Long storeId);

    Optional<MarketplaceStore> findByMarketplace_IdAndStore_Id(Long marketplaceId, Long storeId);
    Optional<MarketplaceStore> findByMarketplace_Bank_IdAndStore_Id(Long bankId, Long storeId);
}
