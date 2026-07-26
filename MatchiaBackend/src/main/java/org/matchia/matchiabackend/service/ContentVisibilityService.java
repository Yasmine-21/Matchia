package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.entity.Content;
import org.matchia.matchiabackend.entity.ContentVisibility;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.repository.ContentRepository;
import org.matchia.matchiabackend.repository.ContentVisibilityRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContentVisibilityService {

    private final ContentVisibilityRepository contentVisibilityRepository;
    private final ContentRepository contentRepository;
    private final MarketplaceRepository marketplaceRepository;

    @Transactional(readOnly = true)
    public Map<Long, Boolean> getVisibilityMapByMarketplaceSlug(String marketplaceSlug) {
        if (!hasText(marketplaceSlug)) {
            return Collections.emptyMap();
        }

        return contentVisibilityRepository.findByMarketplace_Bank_Slug(marketplaceSlug.trim().toLowerCase()).stream()
                .filter(visibility -> visibility.getContent() != null && visibility.getContent().getId() != null)
                .collect(Collectors.toMap(
                        visibility -> visibility.getContent().getId(),
                        visibility -> visibility.getVisible() == null || visibility.getVisible(),
                        (left, right) -> right
                ));
    }

    @Transactional(readOnly = true)
    public boolean isVisibleForMarketplace(Content content, String marketplaceSlug) {
        if (content == null || content.getId() == null || !hasText(marketplaceSlug)) {
            return true;
        }

        return contentVisibilityRepository
                .findByMarketplace_Bank_SlugAndContent_Id(marketplaceSlug.trim().toLowerCase(), content.getId())
                .map(visibility -> visibility.getVisible() == null || visibility.getVisible())
                .orElse(true);
    }

    @Transactional
    public ContentVisibility updateVisibility(Long contentId, String marketplaceSlug, boolean visible) {
        if (contentId == null) {
            throw new IllegalArgumentException("Le contenu selectionne est introuvable.");
        }
        if (!hasText(marketplaceSlug)) {
            throw new IllegalArgumentException("La marketplace selectionnee est introuvable.");
        }

        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Le contenu selectionne est introuvable."));

        Marketplace marketplace = marketplaceRepository.findByBank_Slug(marketplaceSlug.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("La marketplace selectionnee est introuvable."));

        ensureContentBelongsToMarketplace(content, marketplace);

        ContentVisibility visibility = contentVisibilityRepository
                .findByMarketplace_IdAndContent_Id(marketplace.getId(), content.getId())
                .orElseGet(ContentVisibility::new);

        visibility.setMarketplace(marketplace);
        visibility.setContent(content);
        visibility.setVisible(visible);

        return contentVisibilityRepository.save(visibility);
    }

    private void ensureContentBelongsToMarketplace(Content content, Marketplace marketplace) {
        if (content == null || marketplace == null) {
            throw new IllegalArgumentException("Le contenu selectionne est introuvable.");
        }

        Store store = content.getStore();
        if (store == null || marketplace.getMarketplaceStores() == null) {
            throw new IllegalArgumentException("Le contenu selectionne n'appartient pas a votre marketplace.");
        }

        boolean belongsToMarketplace = marketplace.getMarketplaceStores().stream()
                .anyMatch((marketplaceStore) ->
                        marketplaceStore != null
                                && marketplaceStore.getStore() != null
                                && marketplaceStore.getStore().getId() != null
                                && marketplaceStore.getStore().getId().equals(store.getId()));

        if (!belongsToMarketplace) {
            throw new IllegalArgumentException("Le contenu selectionne n'appartient pas a votre marketplace.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
