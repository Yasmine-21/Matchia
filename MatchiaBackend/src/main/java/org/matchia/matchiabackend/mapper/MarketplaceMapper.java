package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestStoreSelection;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class MarketplaceMapper {
    private final MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    private final RequestRepository requestRepository;

    public MarketplaceMapper(
            MarketplaceStoreModuleRepository marketplaceStoreModuleRepository,
            RequestRepository requestRepository
    ) {
        this.marketplaceStoreModuleRepository = marketplaceStoreModuleRepository;
        this.requestRepository = requestRepository;
    }

    public MarketplaceDto toDto(Marketplace entity) {
        if (entity == null) return null;
        List<MarketplaceDto.MarketplaceStoreDetailDto> stores = toStoreDetails(entity.getMarketplaceStores());
        return new MarketplaceDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getBank() != null ? entity.getBank().getName() : null,
            entity.getBank() != null ? entity.getBank().getSlug() : null,
            entity.getBank() != null ? entity.getBank().getLogoUrl() : null,
            entity.getBank() != null ? entity.getBank().getEmail() : null,
            entity.getBank() != null ? entity.getBank().getCountry() : null,
            entity.getBank() != null ? entity.getBank().getWebsiteUrl() : null,
            entity.getBank() != null ? entity.getBank().getDescription() : null,
            entity.getBank() != null ? entity.getBank().getEstablishedYear() : null,
            entity.getPrimaryColor(),
            entity.getSecondaryColor(),
            entity.getHomepageTitle(),
            entity.getWelcomeText(),
            entity.getBanniereUrl(),
            entity.getBannerImageUrl(),
            entity.getFooterText(),
            entity.getLogoImageUrl(),
            entity.getTotalMonthlyPrice(),
            entity.getStatus(),
            entity.getCreatedAt(),
            stores.size(),
            stores
        );
    }

    public MarketplaceDto toPublicDto(Marketplace entity) {
        if (entity == null) return null;
        Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> requestedModulesByStore =
                resolveRequestedModulesByStore(entity.getBank() != null ? entity.getBank().getSlug() : null);
        List<MarketplaceDto.MarketplaceStoreDetailDto> stores = toPublicStoreDetails(entity.getMarketplaceStores(), requestedModulesByStore);
        return new MarketplaceDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getBank() != null ? entity.getBank().getName() : null,
            entity.getBank() != null ? entity.getBank().getSlug() : null,
            entity.getBank() != null ? entity.getBank().getLogoUrl() : null,
            entity.getBank() != null ? entity.getBank().getEmail() : null,
            entity.getBank() != null ? entity.getBank().getCountry() : null,
            entity.getBank() != null ? entity.getBank().getWebsiteUrl() : null,
            entity.getBank() != null ? entity.getBank().getDescription() : null,
            entity.getBank() != null ? entity.getBank().getEstablishedYear() : null,
            entity.getPrimaryColor(),
            entity.getSecondaryColor(),
            entity.getHomepageTitle(),
            entity.getWelcomeText(),
            entity.getBanniereUrl(),
            entity.getBannerImageUrl(),
            entity.getFooterText(),
            entity.getLogoImageUrl(),
            entity.getTotalMonthlyPrice(),
            entity.getStatus(),
            entity.getCreatedAt(),
            stores.size(),
            stores
        );
    }

    private List<MarketplaceDto.MarketplaceStoreDetailDto> toStoreDetails(List<MarketplaceStore> marketplaceStores) {
        if (marketplaceStores == null) return List.of();

        return marketplaceStores.stream()
            .map((marketplaceStore) -> new MarketplaceDto.MarketplaceStoreDetailDto(
                marketplaceStore.getId(),
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getName() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getDescription() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getBanniereUrl() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getPrice() : null,
                marketplaceStore.getEnabled(),
                marketplaceStore.getVisible(),
                toModuleDetails(marketplaceStore.getMarketplaceStoreModules())
            ))
            .toList();
    }

    private List<MarketplaceDto.MarketplaceStoreDetailDto> toStoreDetails(
            List<MarketplaceStore> marketplaceStores,
            Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> requestedModulesByStore
    ) {
        if (marketplaceStores == null) return List.of();

        return marketplaceStores.stream()
                .map((marketplaceStore) -> new MarketplaceDto.MarketplaceStoreDetailDto(
                        marketplaceStore.getId(),
                        marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                        marketplaceStore.getStore() != null ? marketplaceStore.getStore().getName() : null,
                        marketplaceStore.getStore() != null ? marketplaceStore.getStore().getDescription() : null,
                        marketplaceStore.getStore() != null ? marketplaceStore.getStore().getBanniereUrl() : null,
                        marketplaceStore.getStore() != null ? marketplaceStore.getStore().getPrice() : null,
                        marketplaceStore.getEnabled(),
                        marketplaceStore.getVisible(),
                        toPublicStoreModules(marketplaceStore, requestedModulesByStore)
                ))
                .toList();
    }

    private List<MarketplaceDto.MarketplaceModuleDetailDto> toPublicStoreModules(
            MarketplaceStore marketplaceStore,
            Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> requestedModulesByStore
    ) {
        if (marketplaceStore == null) {
            return List.of();
        }

        Long storeId = marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null;
        if (storeId != null && requestedModulesByStore != null && requestedModulesByStore.containsKey(storeId)) {
            return requestedModulesByStore.get(storeId);
        }

        return toPublicModuleDetails(marketplaceStore.getId());
    }

    private List<MarketplaceDto.MarketplaceModuleDetailDto> toModuleDetails(List<MarketplaceStoreModule> marketplaceStoreModules) {
        if (marketplaceStoreModules == null) return List.of();

        return marketplaceStoreModules.stream()
            .map((marketplaceStoreModule) -> new MarketplaceDto.MarketplaceModuleDetailDto(
                marketplaceStoreModule.getId(),
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getId() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getName() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getCategory() : null,
                marketplaceStoreModule.getModule() != null ? marketplaceStoreModule.getModule().getPrice() : null,
                marketplaceStoreModule.getEnabled(),
                marketplaceStoreModule.getVisible()
            ))
            .toList();
    }

    public Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> resolveRequestedModulesByStore(String marketplaceSlug) {
        if (marketplaceSlug == null || marketplaceSlug.isBlank()) {
            return Map.of();
        }

        Optional<Request> approvedRequest = requestRepository
                .findFirstByMarketplaceSlugIgnoreCaseAndStatusOrderByUpdatedAtDesc(
                        marketplaceSlug.trim(),
                        RequestStatusEnum.approved
                );

        if (approvedRequest.isEmpty() || approvedRequest.get().getSelectedStoreDetails() == null) {
            return Map.of();
        }

        return approvedRequest.get().getSelectedStoreDetails().stream()
                .filter((storeSelection) -> storeSelection != null && storeSelection.getStoreId() != null)
                .collect(Collectors.toMap(
                        RequestStoreSelection::getStoreId,
                        storeSelection -> toRequestedModules(storeSelection.getModules()),
                        (left, right) -> right
                ));
    }

    public MarketplaceDto.MarketplaceStoreDetailDto toPublicStoreDetailDto(
            MarketplaceStore marketplaceStore,
            List<MarketplaceDto.MarketplaceModuleDetailDto> requestedModules
    ) {
        if (marketplaceStore == null) {
            return null;
        }

        List<MarketplaceDto.MarketplaceModuleDetailDto> modules = requestedModules != null
                ? requestedModules
                : toPublicModuleDetails(marketplaceStore.getId());

        return new MarketplaceDto.MarketplaceStoreDetailDto(
                marketplaceStore.getId(),
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getName() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getDescription() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getBanniereUrl() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getPrice() : null,
                marketplaceStore.getEnabled(),
                marketplaceStore.getVisible(),
                modules
        );
    }

    private List<MarketplaceDto.MarketplaceStoreDetailDto> toPublicStoreDetails(
            List<MarketplaceStore> marketplaceStores,
            Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> requestedModulesByStore
    ) {
        if (marketplaceStores == null) return List.of();

        return marketplaceStores.stream()
            .filter((marketplaceStore) -> Boolean.TRUE.equals(marketplaceStore.getEnabled())
                    && Boolean.TRUE.equals(marketplaceStore.getVisible())
                    && marketplaceStore.getStore() != null)
            .map((marketplaceStore) -> toPublicStoreDetailDto(
                    marketplaceStore,
                    requestedModulesByStore.get(marketplaceStore.getStore().getId())
            ))
            .toList();
    }

    private List<MarketplaceDto.MarketplaceModuleDetailDto> toRequestedModules(List<RequestModuleSelection> requestedModules) {
        if (requestedModules == null) return List.of();

        return requestedModules.stream()
                .filter((module) -> module != null && module.getModuleId() != null)
                .map((module) -> new MarketplaceDto.MarketplaceModuleDetailDto(
                        null,
                        module.getModuleId(),
                        module.getModuleName(),
                        null,
                        module.getModulePrice(),
                        Boolean.TRUE,
                        Boolean.TRUE
                ))
                .toList();
    }

    private List<MarketplaceDto.MarketplaceModuleDetailDto> toPublicModuleDetails(Long marketplaceStoreId) {
        if (marketplaceStoreId == null) return List.of();

        return marketplaceStoreModuleRepository.findAll().stream()
            .filter((marketplaceStoreModule) ->
                marketplaceStoreModule != null
                && marketplaceStoreModule.getMarketplaceStore() != null
                && marketplaceStoreModule.getMarketplaceStore().getId() != null
                && marketplaceStoreModule.getMarketplaceStore().getId().equals(marketplaceStoreId)
                && Boolean.TRUE.equals(marketplaceStoreModule.getEnabled())
                && Boolean.TRUE.equals(marketplaceStoreModule.getVisible())
                && marketplaceStoreModule.getModule() != null
                && marketplaceStoreModule.getModule().getStatus() == ModuleStatusEnum.active
            )
            .map((marketplaceStoreModule) -> new MarketplaceDto.MarketplaceModuleDetailDto(
                marketplaceStoreModule.getId(),
                marketplaceStoreModule.getModule().getId(),
                marketplaceStoreModule.getModule().getName(),
                marketplaceStoreModule.getModule().getCategory(),
                marketplaceStoreModule.getModule().getPrice(),
                marketplaceStoreModule.getEnabled(),
                marketplaceStoreModule.getVisible()
            ))
            .toList();
    }

    public Marketplace toEntity(MarketplaceDto dto) {
        if (dto == null) return null;
        Marketplace entity = new Marketplace();
        entity.setId(dto.getId());
        entity.setPrimaryColor(dto.getPrimaryColor());
        entity.setSecondaryColor(dto.getSecondaryColor());
        entity.setHomepageTitle(dto.getHomepageTitle());
        entity.setWelcomeText(dto.getWelcomeText());
        entity.setBanniereUrl(hasText(dto.getBanniereUrl()) ? dto.getBanniereUrl() : dto.getBannerImageUrl());
        entity.setFooterText(dto.getFooterText());
        entity.setLogoImageUrl(dto.getLogoImageUrl());
        entity.setTotalMonthlyPrice(dto.getTotalMonthlyPrice());
        entity.setStatus(dto.getStatus());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
