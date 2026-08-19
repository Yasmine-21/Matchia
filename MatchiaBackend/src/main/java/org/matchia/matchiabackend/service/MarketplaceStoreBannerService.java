package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceStoreBannerDto;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

/**
 * Keeps store-banner management isolated to the bank that owns the marketplace.
 * File storage is deliberately reused from {@link MarketplaceService}.
 */
@Service
@RequiredArgsConstructor
public class MarketplaceStoreBannerService {

    private final MarketplaceStoreRepository marketplaceStoreRepository;
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
        marketplaceStore.setBannerImageUrl(marketplaceService.saveBanniere(banner));
        return toDto(marketplaceStoreRepository.save(marketplaceStore));
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

    private MarketplaceStoreBannerDto toDto(MarketplaceStore marketplaceStore) {
        return new MarketplaceStoreBannerDto(
                marketplaceStore.getId(),
                marketplaceStore.getMarketplace() != null ? marketplaceStore.getMarketplace().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getBannerImageUrl()
        );
    }
}
