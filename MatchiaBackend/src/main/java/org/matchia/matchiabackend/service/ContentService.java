package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ContentDto;
import org.matchia.matchiabackend.entity.Content;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ContentStatusEnum;
import org.matchia.matchiabackend.mapper.ContentMapper;
import org.matchia.matchiabackend.repository.ContentRepository;
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
public class ContentService {

    private final ContentRepository contentRepository;
    private final StoreRepository storeRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final ContentMapper contentMapper;

    @Value("${app.content.upload.dir:uploads/content}")
    private String contentUploadDir;

    @Transactional(readOnly = true)
    public List<ContentDto> getAllContents() {
        return contentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(contentMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContentDto> getContentsByMarketplaceSlug(String marketplaceSlug) {
        if (!hasText(marketplaceSlug)) {
            return List.of();
        }

        Marketplace marketplace = marketplaceRepository.findByBank_Slug(marketplaceSlug.trim().toLowerCase())
                .orElse(null);
        if (marketplace == null || marketplace.getMarketplaceStores() == null) {
            return List.of();
        }

        List<Long> storeIds = marketplace.getMarketplaceStores().stream()
                .map((marketplaceStore) -> marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null)
                .filter((storeId) -> storeId != null)
                .toList();

        if (storeIds.isEmpty()) {
            return List.of();
        }

        return contentRepository.findByStore_IdInOrderByCreatedAtDesc(storeIds).stream()
                .map(contentMapper::toDto)
                .toList();
    }

    @Transactional
    public ContentDto createContent(
            Long storeId,
            String title,
            String description,
            String status,
            String marketplaceSlug,
            MultipartFile image
    ) throws IOException {
        if (storeId == null) {
            throw new IllegalArgumentException("Le store est obligatoire.");
        }
        if (!hasText(title)) {
            throw new IllegalArgumentException("Le titre est obligatoire.");
        }
        if (!hasText(description)) {
            throw new IllegalArgumentException("La description est obligatoire.");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Le store selectionne est introuvable."));
        ensureStoreBelongsToMarketplace(store, marketplaceSlug);

        Content content = new Content();
        content.setStore(store);
        content.setTitle(title.trim());
        content.setDescription(description.trim());
        content.setStatus(resolveStatus(status));
        content.setImageUrl(saveImage(image));

        Content saved = contentRepository.save(content);
        return contentMapper.toDto(saved);
    }

    @Transactional
    public ContentDto updateContent(
            Long id,
            Long storeId,
            String title,
            String description,
            String status,
            String marketplaceSlug,
            MultipartFile image
    ) throws IOException {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Le contenu selectionne est introuvable."));

        if (storeId == null) {
            throw new IllegalArgumentException("Le store est obligatoire.");
        }
        if (!hasText(title)) {
            throw new IllegalArgumentException("Le titre est obligatoire.");
        }
        if (!hasText(description)) {
            throw new IllegalArgumentException("La description est obligatoire.");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Le store selectionne est introuvable."));
        ensureStoreBelongsToMarketplace(store, marketplaceSlug);

        content.setStore(store);
        content.setTitle(title.trim());
        content.setDescription(description.trim());
        content.setStatus(resolveStatus(status));

        String uploadedImage = saveImage(image);
        if (uploadedImage != null) {
            content.setImageUrl(uploadedImage);
        }

        Content saved = contentRepository.save(content);
        return contentMapper.toDto(saved);
    }

    @Transactional
    public void deleteContent(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Le contenu selectionne est introuvable.");
        }

        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Le contenu selectionne est introuvable."));
        contentRepository.delete(content);
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
        return "/uploads/content/" + filename;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void ensureStoreBelongsToMarketplace(Store store, String marketplaceSlug) {
        if (store == null || !hasText(marketplaceSlug)) {
            return;
        }

        Marketplace marketplace = marketplaceRepository.findByBank_Slug(marketplaceSlug.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("La marketplace selectionnee est introuvable."));

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
}
