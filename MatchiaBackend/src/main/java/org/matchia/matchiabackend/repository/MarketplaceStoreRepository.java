package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.dto.StoreMarketplaceCountDto;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            select new org.matchia.matchiabackend.dto.StoreMarketplaceCountDto(
                store.id,
                store.name,
                count(distinct marketplaceStore.marketplace.id)
            )
            from Store store
            left join store.marketplaceStores marketplaceStore
                on marketplaceStore.enabled = true
                and marketplaceStore.visible = true
                and marketplaceStore.marketplace.status = :marketplaceStatus
            group by store.id, store.name
            order by store.name
            """)
    List<StoreMarketplaceCountDto> countDistinctMarketplacesByStore(
            @Param("marketplaceStatus") MarketplaceStatusEnum marketplaceStatus
    );
}
