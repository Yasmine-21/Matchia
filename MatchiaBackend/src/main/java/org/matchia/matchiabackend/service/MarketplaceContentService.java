package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceContentDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceContent;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ContentStatusEnum;
import org.matchia.matchiabackend.mapper.MarketplaceContentMapper;
import org.matchia.matchiabackend.repository.MarketplaceContentRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MarketplaceContentService {

    private final MarketplaceContentRepository marketplaceContentRepository;
    private final StoreRepository storeRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final MarketplaceContentMapper marketplaceContentMapper;

    @Value("${app.marketplace-content.upload.dir:uploads/marketplace-content}")
    private String contentUploadDir;

    @Transactional(readOnly = true)
    public List<MarketplaceContentDto> getAllContents() {
        return marketplaceContentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(marketplaceContentMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarketplaceContentDto> getContentsByMarketplaceSlug(String marketplaceSlug) {
        if (!hasText(marketplaceSlug)) {
            return List.of();
        }

        return marketplaceContentRepository.findByMarketplace_Bank_SlugOrderByCreatedAtDesc(marketplaceSlug.trim().toLowerCase()).stream()
                .map(marketplaceContentMapper::toDto)
                .toList();
    }

    @Transactional
    public MarketplaceContentDto createContent(
            Long storeId,
            String title,
            String description,
            String status,
            String marketplaceSlug,
            MultipartFile image
    ) throws IOException {
        Marketplace marketplace = resolveMarketplace(marketplaceSlug);
        validateRequest(title, description);

        MarketplaceContent content = new MarketplaceContent();
        content.setMarketplace(marketplace);
        content.setStore(resolveStore(storeId, marketplace));
        content.setTitle(title.trim());
        content.setDescription(description.trim());
        content.setStatus(resolveStatus(status));
        content.setImageUrl(saveImage(image));

        MarketplaceContent saved = marketplaceContentRepository.save(content);
        return marketplaceContentMapper.toDto(saved);
    }

    @Transactional
    public MarketplaceContentDto updateContent(
            Long id,
            Long storeId,
            String title,
            String description,
            String status,
            String marketplaceSlug,
            MultipartFile image
    ) throws IOException {
        MarketplaceContent content = marketplaceContentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Le contenu selectionne est introuvable."));
        ensureMarketplaceOwnership(content, marketplaceSlug);
        validateRequest(title, description);

        Marketplace marketplace = resolveMarketplace(marketplaceSlug);

        content.setMarketplace(marketplace);
        content.setStore(resolveStore(storeId, marketplace));
        content.setTitle(title.trim());
        content.setDescription(description.trim());
        content.setStatus(resolveStatus(status));

        String uploadedImage = saveImage(image);
        if (uploadedImage != null) {
            content.setImageUrl(uploadedImage);
        }

        MarketplaceContent saved = marketplaceContentRepository.save(content);
        return marketplaceContentMapper.toDto(saved);
    }

    @Transactional
    public void deleteContent(Long id, String marketplaceSlug) {
        if (id == null) {
            throw new IllegalArgumentException("Le contenu selectionne est introuvable.");
        }

        MarketplaceContent content = marketplaceContentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Le contenu selectionne est introuvable."));
        ensureMarketplaceOwnership(content, marketplaceSlug);
        marketplaceContentRepository.delete(content);
    }

    private void validateRequest(String title, String description) {
        if (!hasText(title)) {
            throw new IllegalArgumentException("Le titre est obligatoire.");
        }
        if (!hasText(description)) {
            throw new IllegalArgumentException("La description est obligatoire.");
        }
    }

    private Marketplace resolveMarketplace(String marketplaceSlug) {
        if (!hasText(marketplaceSlug)) {
            throw new IllegalArgumentException("La marketplace selectionnee est obligatoire.");
        }

        return marketplaceRepository.findByBank_Slug(marketplaceSlug.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("La marketplace selectionnee est introuvable."));
    }

    private Store resolveStore(Long storeId, Marketplace marketplace) {
        if (storeId == null) {
            return null;
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Le store selectionne est introuvable."));
        ensureStoreBelongsToMarketplace(store, marketplace);
        return store;
    }

    private void ensureMarketplaceOwnership(MarketplaceContent content, String marketplaceSlug) {
        if (content == null) {
            throw new IllegalArgumentException("Le contenu selectionne est introuvable.");
        }

        Marketplace marketplace = resolveMarketplace(marketplaceSlug);
        Long contentMarketplaceId = content.getMarketplace() != null ? content.getMarketplace().getId() : null;
        if (contentMarketplaceId == null || !contentMarketplaceId.equals(marketplace.getId())) {
            throw new IllegalArgumentException("Le contenu selectionne n'appartient pas a votre marketplace.");
        }
    }

    private void ensureStoreBelongsToMarketplace(Store store, Marketplace marketplace) {
        if (store == null || marketplace == null) {
            return;
        }

        boolean belongsToMarketplace = marketplace.getMarketplaceStores() != null
                && marketplace.getMarketplaceStores().stream()
                .anyMatch((marketplaceStore) ->
                        marketplaceStore != null
                                && marketplaceStore.getStore() != null
                                && marketplaceStore.getStore().getId() != null
                                && marketplaceStore.getStore().getId().equals(store.getId()));

        if (!belongsToMarketplace) {
            throw new IllegalArgumentException("Le store selectionne n'appartient pas a votre marketplace.");
        }
    }

    private ContentStatusEnum resolveStatus(String status) {
        if (!hasText(status)) {
            return ContentStatusEnum.active;
        }

        try {
            return ContentStatusEnum.valueOf(status.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Le statut du contenu est invalide.");
        }
    }

    private String saveImage(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) {
            return null;
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("L'image du contenu doit etre une image.");
        }

        String original = image.getOriginalFilename();
        String extension = original != null && original.contains(".")
                ? original.substring(original.lastIndexOf("."))
                : "";
        String filename = UUID.randomUUID() + extension;
        Path dir = Paths.get(contentUploadDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        Files.copy(image.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/marketplace-content/" + filename;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
