package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarketplaceStoreModuleRepository extends JpaRepository<MarketplaceStoreModule, Long> {
    Optional<MarketplaceStoreModule> findByMarketplaceStore_IdAndModule_Id(Long marketplaceStoreId, Long moduleId);
}
