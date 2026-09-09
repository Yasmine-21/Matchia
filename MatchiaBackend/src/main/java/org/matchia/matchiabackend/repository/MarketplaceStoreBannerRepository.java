package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.MarketplaceStoreBanner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketplaceStoreBannerRepository extends JpaRepository<MarketplaceStoreBanner, Long> {
    List<MarketplaceStoreBanner> findByMarketplaceStore_IdOrderByDisplayOrderAscIdAsc(Long marketplaceStoreId);
    Optional<MarketplaceStoreBanner> findByIdAndMarketplaceStore_Id(Long id, Long marketplaceStoreId);
    long countByMarketplaceStore_Id(Long marketplaceStoreId);
}
