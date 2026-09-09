package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceStoreBannerDto;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreBanner;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreBannerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;

/**
 * Keeps store-banner management isolated to the bank that owns the marketplace.
 * File storage is deliberately reused from {@link MarketplaceService}.
 */
@Service
@RequiredArgsConstructor
public class MarketplaceStoreBannerService {

    private static final int MAX_BANNERS = 3;

    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final MarketplaceStoreBannerRepository bannerRepository;
    private final DealerSecurityService dealerSecurityService;
    private final MarketplaceService marketplaceService;

    @Transactional(readOnly = true)
    public MarketplaceStoreBannerDto getBanner(Authentication authentication, Long marketplaceStoreId) {
        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        return toDto(marketplaceStore);
    }

    @Transactional
    public MarketplaceStoreBannerDto replaceBanner(
            Authentication authentication,
            Long marketplaceStoreId,
            MultipartFile banner
    ) throws IOException {
        if (banner == null || banner.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'image de bannière est obligatoire.");
        }
        if (banner.getContentType() == null || !banner.getContentType().toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La bannière doit être une image.");
        }

        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        ensureBannerModuleActive(marketplaceStore);
        // Legacy endpoint: retain its replace-first-banner behavior for existing callers.
        marketplaceStore.setBannerImageUrl(marketplaceService.saveBanniere(banner));
        return toDto(marketplaceStoreRepository.save(marketplaceStore));
    }

    @Transactional
    public MarketplaceStoreBannerDto addBanner(Authentication authentication, Long marketplaceStoreId, MultipartFile banner) throws IOException {
        validateBanner(banner);
        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        ensureBannerModuleActive(marketplaceStore);
        migrateLegacyBanner(marketplaceStore);
        List<MarketplaceStoreBanner> images = bannerRepository.findByMarketplaceStore_IdOrderByDisplayOrderAscIdAsc(marketplaceStoreId);
        if (images.size() >= MAX_BANNERS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un store peut avoir au maximum 3 banniÃ¨res.");
        }

        MarketplaceStoreBanner image = new MarketplaceStoreBanner();
        image.setMarketplaceStore(marketplaceStore);
        image.setImageUrl(marketplaceService.saveBanniere(banner));
        image.setDisplayOrder(images.isEmpty() ? 0 : images.get(images.size() - 1).getDisplayOrder() + 1);
        bannerRepository.save(image);
        return toDto(marketplaceStore);
    }

    @Transactional
    public MarketplaceStoreBannerDto replaceBannerImage(Authentication authentication, Long marketplaceStoreId, Long bannerId, MultipartFile banner) throws IOException {
        validateBanner(banner);
        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        ensureBannerModuleActive(marketplaceStore);
        MarketplaceStoreBanner image = bannerRepository.findByIdAndMarketplaceStore_Id(bannerId, marketplaceStoreId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "BanniÃ¨re introuvable."));
        image.setImageUrl(marketplaceService.saveBanniere(banner));
        bannerRepository.save(image);
        return toDto(marketplaceStore);
    }

    @Transactional
    public void deleteBanner(Authentication authentication, Long marketplaceStoreId, Long bannerId) {
        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        ensureBannerModuleActive(marketplaceStore);
        MarketplaceStoreBanner image = bannerRepository.findByIdAndMarketplaceStore_Id(bannerId, marketplaceStoreId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "BanniÃ¨re introuvable."));
        bannerRepository.delete(image);
    }

    @Transactional
    public void deleteLegacyBanner(Authentication authentication, Long marketplaceStoreId) {
        MarketplaceStore marketplaceStore = getOwnedMarketplaceStore(authentication, marketplaceStoreId);
        ensureBannerModuleActive(marketplaceStore);
        marketplaceStore.setBannerImageUrl(null);
        marketplaceStoreRepository.save(marketplaceStore);
    }

    private void validateBanner(MultipartFile banner) {
        if (banner == null || banner.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'image de banniÃ¨re est obligatoire.");
        }
        if (banner.getContentType() == null || !banner.getContentType().toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La banniÃ¨re doit Ãªtre une image.");
        }
    }

    private void migrateLegacyBanner(MarketplaceStore marketplaceStore) {
        if (bannerRepository.countByMarketplaceStore_Id(marketplaceStore.getId()) > 0
                || marketplaceStore.getBannerImageUrl() == null || marketplaceStore.getBannerImageUrl().isBlank()) {
            return;
        }
        MarketplaceStoreBanner legacy = new MarketplaceStoreBanner();
        legacy.setMarketplaceStore(marketplaceStore);
        legacy.setImageUrl(marketplaceStore.getBannerImageUrl());
        legacy.setDisplayOrder(0);
        bannerRepository.save(legacy);
    }

    private MarketplaceStore getOwnedMarketplaceStore(Authentication authentication, Long marketplaceStoreId) {
        User user = dealerSecurityService.currentUser(authentication);
        if (user.getRole() != RoleEnum.ADMIN_BANK || user.getBank() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administration de la banque.");
        }

        MarketplaceStore marketplaceStore = marketplaceStoreRepository.findById(marketplaceStoreId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store de marketplace introuvable."));

        Long ownerBankId = marketplaceStore.getMarketplace() != null && marketplaceStore.getMarketplace().getBank() != null
                ? marketplaceStore.getMarketplace().getBank().getId()
                : null;
        if (ownerBankId == null || !ownerBankId.equals(user.getBank().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce store n'appartient pas à votre marketplace.");
        }
        return marketplaceStore;
    }

    private void ensureBannerModuleActive(MarketplaceStore marketplaceStore) {
        boolean active = marketplaceStore.getMarketplaceStoreModules() != null
                && marketplaceStore.getMarketplaceStoreModules().stream().anyMatch(assignment ->
                assignment.getModule() != null
                        && assignment.getModule().getName() != null
                        && isBannerModuleName(assignment.getModule().getName())
                        && Boolean.TRUE.equals(assignment.getEnabled())
                        && Boolean.TRUE.equals(assignment.getVisible()));
        if (!active) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Le module BanniÃ¨re doit Ãªtre actif pour configurer des images.");
        }
    }

    private boolean isBannerModuleName(String moduleName) {
        String normalized = java.text.Normalizer.normalize(moduleName, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
        return normalized.contains("banner") || normalized.contains("banniere");
    }

    private MarketplaceStoreBannerDto toDto(MarketplaceStore marketplaceStore) {
        List<MarketplaceStoreBannerDto.BannerImageDto> images = bannerRepository
                .findByMarketplaceStore_IdOrderByDisplayOrderAscIdAsc(marketplaceStore.getId())
                .stream()
                .sorted(Comparator.comparing(MarketplaceStoreBanner::getDisplayOrder).thenComparing(MarketplaceStoreBanner::getId))
                .map(image -> new MarketplaceStoreBannerDto.BannerImageDto(image.getId(), image.getImageUrl(), image.getDisplayOrder()))
                .toList();
        if (images.isEmpty() && marketplaceStore.getBannerImageUrl() != null && !marketplaceStore.getBannerImageUrl().isBlank()) {
            images = List.of(new MarketplaceStoreBannerDto.BannerImageDto(null, marketplaceStore.getBannerImageUrl(), 0));
        }
        return new MarketplaceStoreBannerDto(
                marketplaceStore.getId(),
                marketplaceStore.getMarketplace() != null ? marketplaceStore.getMarketplace().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getBannerImageUrl(),
                images
        );
    }
}
