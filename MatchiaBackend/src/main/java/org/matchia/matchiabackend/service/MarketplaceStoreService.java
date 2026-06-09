package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.MarketplaceStoreDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class MarketplaceStoreService {

    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final StoreRepository storeRepository;

    public MarketplaceStoreService(
            MarketplaceStoreRepository marketplaceStoreRepository,
            MarketplaceRepository marketplaceRepository,
            StoreRepository storeRepository
    ) {
        this.marketplaceStoreRepository = marketplaceStoreRepository;
        this.marketplaceRepository = marketplaceRepository;
        this.storeRepository = storeRepository;
    }

    /**
     * Create or update a MarketplaceStore.
     * @param marketplaceStore The MarketplaceStore to save.
     * @return The saved MarketplaceStore.
     */
    public MarketplaceStore save(MarketplaceStore marketplaceStore) {
        return marketplaceStoreRepository.save(marketplaceStore);
    }

    @Transactional
    public MarketplaceStore create(MarketplaceStoreDto dto) {
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        applyDto(dto, marketplaceStore, true);
        return marketplaceStoreRepository.save(marketplaceStore);
    }

    @Transactional
    public MarketplaceStore update(Long id, MarketplaceStoreDto dto) {
        MarketplaceStore marketplaceStore = marketplaceStoreRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Marketplace store introuvable : " + id));
        applyDto(dto, marketplaceStore, false);
        return marketplaceStoreRepository.save(marketplaceStore);
    }

    /**
     * Get all MarketplaceStores.
     * @return List of MarketplaceStore.
     */
    public List<MarketplaceStore> findAll() {
        return marketplaceStoreRepository.findAll();
    }

    /**
     * Find a MarketplaceStore by its ID.
     * @param id The ID of the MarketplaceStore.
     * @return An Optional containing the MarketplaceStore if found.
     */
    public Optional<MarketplaceStore> findById(Long id) {
        return marketplaceStoreRepository.findById(id);
    }

    /**
     * Delete a MarketplaceStore by its ID.
     * @param id The ID of the MarketplaceStore to delete.
     */
    public void deleteById(Long id) {
        marketplaceStoreRepository.deleteById(id);
    }

    private void applyDto(MarketplaceStoreDto dto, MarketplaceStore entity, boolean requireRelations) {
        if (dto == null) {
            throw new IllegalArgumentException("Les donnees marketplace store sont obligatoires.");
        }

        if (dto.getMarketplaceId() != null) {
            Marketplace marketplace = marketplaceRepository.findById(dto.getMarketplaceId())
                    .orElseThrow(() -> new NoSuchElementException("Marketplace introuvable : " + dto.getMarketplaceId()));
            entity.setMarketplace(marketplace);
        } else if (requireRelations) {
            throw new IllegalArgumentException("marketplaceId est obligatoire.");
        }

        if (dto.getStoreId() != null) {
            Store store = storeRepository.findById(dto.getStoreId())
                    .orElseThrow(() -> new NoSuchElementException("Store introuvable : " + dto.getStoreId()));
            entity.setStore(store);
        } else if (requireRelations) {
            throw new IllegalArgumentException("storeId est obligatoire.");
        }

        if (dto.getEnabled() != null) {
            entity.setEnabled(dto.getEnabled());
        } else if (requireRelations) {
            entity.setEnabled(Boolean.TRUE);
        }

        if (dto.getVisible() != null) {
            entity.setVisible(dto.getVisible());
        } else if (requireRelations) {
            entity.setVisible(Boolean.TRUE);
        }
    }
}
