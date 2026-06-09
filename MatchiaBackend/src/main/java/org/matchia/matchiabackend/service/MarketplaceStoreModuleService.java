package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.MarketplaceStoreModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class MarketplaceStoreModuleService {

    private final MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final ModuleRepository moduleRepository;

    public MarketplaceStoreModuleService(
            MarketplaceStoreModuleRepository marketplaceStoreModuleRepository,
            MarketplaceStoreRepository marketplaceStoreRepository,
            ModuleRepository moduleRepository
    ) {
        this.marketplaceStoreModuleRepository = marketplaceStoreModuleRepository;
        this.marketplaceStoreRepository = marketplaceStoreRepository;
        this.moduleRepository = moduleRepository;
    }

    /**
     * Create or update a MarketplaceStoreModule.
     * @param marketplaceStoreModule The MarketplaceStoreModule to save.
     * @return The saved MarketplaceStoreModule.
     */
    public MarketplaceStoreModule save(MarketplaceStoreModule marketplaceStoreModule) {
        return marketplaceStoreModuleRepository.save(marketplaceStoreModule);
    }

    @Transactional
    public MarketplaceStoreModule create(MarketplaceStoreModuleDto dto) {
        MarketplaceStoreModule marketplaceStoreModule = new MarketplaceStoreModule();
        applyDto(dto, marketplaceStoreModule, true);
        return marketplaceStoreModuleRepository.save(marketplaceStoreModule);
    }

    @Transactional
    public MarketplaceStoreModule update(Long id, MarketplaceStoreModuleDto dto) {
        MarketplaceStoreModule marketplaceStoreModule = marketplaceStoreModuleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Marketplace store module introuvable : " + id));
        applyDto(dto, marketplaceStoreModule, false);
        return marketplaceStoreModuleRepository.save(marketplaceStoreModule);
    }

    /**
     * Get all MarketplaceStoreModules.
     * @return List of MarketplaceStoreModule.
     */
    public List<MarketplaceStoreModule> findAll() {
        return marketplaceStoreModuleRepository.findAll();
    }

    /**
     * Find a MarketplaceStoreModule by its ID.
     * @param id The ID of the MarketplaceStoreModule.
     * @return An Optional containing the MarketplaceStoreModule if found.
     */
    public Optional<MarketplaceStoreModule> findById(Long id) {
        return marketplaceStoreModuleRepository.findById(id);
    }

    /**
     * Delete a MarketplaceStoreModule by its ID.
     * @param id The ID of the MarketplaceStoreModule to delete.
     */
    public void deleteById(Long id) {
        marketplaceStoreModuleRepository.deleteById(id);
    }

    private void applyDto(MarketplaceStoreModuleDto dto, MarketplaceStoreModule entity, boolean requireRelations) {
        if (dto == null) {
            throw new IllegalArgumentException("Les donnees marketplace store module sont obligatoires.");
        }

        if (dto.getMarketplaceStoreId() != null) {
            MarketplaceStore marketplaceStore = marketplaceStoreRepository.findById(dto.getMarketplaceStoreId())
                    .orElseThrow(() -> new NoSuchElementException("Marketplace store introuvable : " + dto.getMarketplaceStoreId()));
            entity.setMarketplaceStore(marketplaceStore);
        } else if (requireRelations) {
            throw new IllegalArgumentException("marketplaceStoreId est obligatoire.");
        }

        if (dto.getModuleId() != null) {
            Module module = moduleRepository.findById(dto.getModuleId())
                    .orElseThrow(() -> new NoSuchElementException("Module introuvable : " + dto.getModuleId()));
            entity.setModule(module);
        } else if (requireRelations) {
            throw new IllegalArgumentException("moduleId est obligatoire.");
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
