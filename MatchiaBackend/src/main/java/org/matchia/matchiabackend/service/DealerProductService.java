package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DealerProductService {
    private final DealerProductRepository productRepository;
    private final ProductPublicationRequestRepository publicationRepository;
    private final PartnershipContractRepository contractRepository;
    private final DealerBankPartnershipRepository partnershipRepository;
    private final ProductParameterDefinitionRepository definitionRepository;
    private final DealerProductDocumentRepository documentRepository;
    private final DealerProductCatalogImageRepository catalogImageRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final DealerSecurityService security;
    private final DealerAccountService accountService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;

    @Value("${app.dealer.product.upload.dir:uploads/dealer-products}") private String uploadDirectory;
    @Value("${app.dealer.product.document-upload.dir:uploads/dealer-product-documents}") private String documentUploadDirectory;
    @Value("${app.dealer.product.catalog-upload.dir:uploads/dealer-product-catalog}") private String catalogUploadDirectory;

    private static final int MAX_CATALOG_IMAGES = 8;

    @Transactional(readOnly = true)
    public List<DealerDtos.ProductView> mine(Authentication auth) {
        User user = security.requireDealer(auth);
        return productRepository.findByDealerIdOrderByCreatedAtDesc(user.getDealer().getId()).stream().map(this::toDealerProductView).toList();
    }

    @Transactional
    public DealerDtos.ProductView create(Authentication auth, DealerDtos.ProductUpsert input, MultipartFile image) {
        return create(auth, input, image, List.of());
    }

    @Transactional
    public DealerDtos.ProductView create(Authentication auth, DealerDtos.ProductUpsert input, MultipartFile image,
                                         List<MultipartFile> catalogImages) {
        User user = security.requireDealer(auth);
        Dealer dealer = user.getDealer();
        validateStore(dealer, input.storeId());
        DealerProduct product = new DealerProduct();
        product.setDealer(dealer); product.setStore(dealer.getStore());
        apply(product, input);
        product.setTotalStock(input.initialStock());
        product.setAvailableStock(input.initialStock());
        product.setReservedStock(0);
        product.setImageUrl(saveImage(image));
        product = productRepository.save(product);
        replaceValues(product, input.parameterValues());
        addCatalogImages(product, catalogImages);
        audit("dealer.product.created", "dealer_product", product.getId());
        return toDealerProductView(productRepository.findByIdAndDealerId(product.getId(), dealer.getId()).orElseThrow());
    }

    @Transactional
    public DealerDtos.ProductView update(Authentication auth, Long id, DealerDtos.ProductUpsert input, MultipartFile image) {
        return update(auth, id, input, image, List.of(), List.of());
    }

    @Transactional
    public DealerDtos.ProductView update(Authentication auth, Long id, DealerDtos.ProductUpsert input, MultipartFile image,
                                         List<MultipartFile> catalogImages, List<Long> catalogImageIdsToDelete) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(id, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        validateStore(user.getDealer(), input.storeId());
        apply(product, input);
        if (image != null && !image.isEmpty()) product.setImageUrl(saveImage(image));
        replaceValues(product, input.parameterValues());
        DealerProduct saved = productRepository.save(product);
        deleteCatalogImages(saved, catalogImageIdsToDelete);
        addCatalogImages(saved, catalogImages);
        audit("dealer.product.updated", "dealer_product", saved.getId());
        return toDealerProductView(saved);
    }

    @Transactional
    public void delete(Authentication auth, Long id) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(id, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        boolean protectedPublication = publicationRepository.findByDealerIdOrderBySubmittedAtDesc(user.getDealer().getId()).stream()
                .anyMatch(publication -> publication.getProduct().getId().equals(id)
                        && List.of(ProductPublicationStatusEnum.PENDING, ProductPublicationStatusEnum.APPROVED).contains(publication.getStatus()));
        if (protectedPublication) throw badRequest("Le produit possede une publication active ou en attente et ne peut pas etre supprime.");
        productRepository.delete(product);
        audit("dealer.product.deleted", "dealer_product", id);
    }

    @Transactional
    public DealerDtos.ProductView addStock(Authentication auth, Long id, DealerDtos.StockAdjustment input) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(id, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        product.setTotalStock((product.getTotalStock() == null ? 0 : product.getTotalStock()) + input.quantity());
        product.setAvailableStock((product.getAvailableStock() == null ? 0 : product.getAvailableStock()) + input.quantity());
        if (product.getReservedStock() == null) product.setReservedStock(0);
        return toDealerProductView(productRepository.save(product));
    }

    @Transactional
    public DealerDtos.ProductDocumentView uploadDocument(Authentication auth, Long productId, String documentType,
                                                           boolean publicDocument, MultipartFile file) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(productId, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        if (file == null || file.isEmpty()) throw badRequest("Le document est obligatoire.");
        if (documentType == null || documentType.isBlank()) throw badRequest("Le type de document est obligatoire.");
        DealerProductDocument document = new DealerProductDocument();
        document.setProduct(product);
        document.setDocumentType(documentType.trim());
        document.setFileName(Optional.ofNullable(file.getOriginalFilename()).filter(name -> !name.isBlank()).orElse("document"));
        document.setFilePath(saveDocument(file));
        document.setPublicDocument(publicDocument);
        document = documentRepository.save(document);
        audit("dealer.product.document.created", "dealer_product_document", document.getId());
        return toDocumentView(document);
    }

    @Transactional
    public void deleteDocument(Authentication auth, Long productId, Long documentId) {
        User user = security.requireDealer(auth);
        productRepository.findByIdAndDealerId(productId, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        DealerProductDocument document = documentRepository.findByIdAndProductId(documentId, productId)
                .orElseThrow(() -> notFound("Document introuvable."));
        deleteStoredFile(document.getFilePath());
        documentRepository.delete(document);
        audit("dealer.product.document.deleted", "dealer_product_document", documentId);
    }

    @Transactional
    public List<DealerDtos.ProductCatalogImageView> uploadCatalogImages(Authentication auth, Long productId,
                                                                          List<MultipartFile> files) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(productId, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        if (files == null || files.stream().allMatch(file -> file == null || file.isEmpty())) {
            throw badRequest("Ajoutez au moins une image au catalogue.");
        }
        addCatalogImages(product, files);
        audit("dealer.product.catalog.created", "dealer_product", productId);
        return catalogImages(productId);
    }

    @Transactional
    public DealerDtos.ProductView deleteCatalogImage(Authentication auth, Long productId, Long imageId) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(productId, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        DealerProductCatalogImage catalogImage = catalogImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> notFound("Image du catalogue introuvable."));
        deleteCatalogStoredFile(catalogImage.getImageUrl());
        catalogImageRepository.delete(catalogImage);
        audit("dealer.product.catalog.deleted", "dealer_product_catalog_image", imageId);
        return toDealerProductView(product);
    }

    @Transactional(readOnly = true)
    public Path documentForDealer(Authentication auth, Long productId, Long documentId) {
        User user = security.requireDealer(auth);
        productRepository.findByIdAndDealerId(productId, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        DealerProductDocument document = documentRepository.findByIdAndProductId(documentId, productId)
                .orElseThrow(() -> notFound("Document introuvable."));
        return documentPath(document);
    }

    @Transactional(readOnly = true)
    public Path publicDocument(Long productId, Long documentId) {
        DealerProductDocument document = documentRepository.findByIdAndProductId(documentId, productId)
                .filter(DealerProductDocument::isPublicDocument)
                .orElseThrow(() -> notFound("Document public introuvable."));
        return documentPath(document);
    }

    @Transactional
    public DealerDtos.PublicationView submit(Authentication auth, DealerDtos.PublicationCreate input) {
        User user = security.requireDealer(auth);
        Dealer dealer = user.getDealer();
        DealerProduct product = productRepository.findByIdAndDealerId(input.productId(), dealer.getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        if (product.getStatus() != DealerProductStatusEnum.ACTIVE) throw badRequest("Activez le produit avant de le soumettre.");
        DealerBankPartnership partnership = partnershipRepository.findById(input.partnershipId())
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getDealer().getId().equals(dealer.getId()) || partnership.getStatus() != DealerPartnershipStatusEnum.ACTIVE
                || !contractRepository.existsByPartnershipIdAndStatus(partnership.getId(), PartnershipContractStatusEnum.ACTIVE)) {
            throw badRequest("Le contrat de partenariat doit etre actif avant de soumettre un produit.");
        }
        if (!partnership.getStore().getId().equals(product.getStore().getId())) throw badRequest("Le produit et le partenariat doivent utiliser le meme store.");
        Marketplace marketplace = marketplaceRepository.findByBankId(partnership.getBank().getId())
                .orElseThrow(() -> badRequest("Marketplace introuvable pour cette banque."));
        ProductPublicationRequest publication = publicationRepository
                .findByProductIdAndBankIdAndStoreId(product.getId(), partnership.getBank().getId(), product.getStore().getId())
                .orElseGet(ProductPublicationRequest::new);
        if (publication.getId() != null && List.of(ProductPublicationStatusEnum.PENDING, ProductPublicationStatusEnum.APPROVED).contains(publication.getStatus())) {
            throw badRequest("Ce produit est deja soumis ou publie pour cette banque.");
        }
        publication.setProduct(product); publication.setDealer(dealer); publication.setPartnership(partnership);
        publication.setBank(partnership.getBank()); publication.setMarketplace(marketplace); publication.setStore(product.getStore());
        publication.setStatus(ProductPublicationStatusEnum.PENDING); publication.setActive(false);
        publication.setRejectionReason(null); publication.setProcessedAt(null);
        publication = publicationRepository.save(publication);
        ProductPublicationRequest savedPublication = publication;
        userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(partnership.getBank().getId(), RoleEnum.ADMIN_BANK)
                .ifPresent(bankAdmin -> notificationService.createNotification("Nouveau produit concessionnaire",
                        dealer.getCompanyName() + " a soumis " + product.getName() + " pour publication.",
                        NotificationTypeEnum.INFO, NotificationStatusEnum.UNREAD, savedPublication.getId(), bankAdmin.getId()));
        audit("dealer.product.submitted", "product_publication", publication.getId());
        return toPublicationView(publication);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PublicationView> publicationsMine(Authentication auth) {
        User user = security.requireDealer(auth);
        return publicationRepository.findByDealerIdOrderBySubmittedAtDesc(user.getDealer().getId()).stream().map(this::toPublicationView).toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PublicationView> publicationsForBank(Authentication auth) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) return publicationRepository.findAll().stream().map(this::toPublicationView).toList();
        return publicationRepository.findByBankIdOrderBySubmittedAtDesc(user.getBank().getId()).stream().map(this::toPublicationView).toList();
    }

    @Transactional
    public DealerDtos.PublicationView decide(Authentication auth, Long id, ProductPublicationStatusEnum status, String reason) {
        User user = security.requireBank(auth);
        ProductPublicationRequest publication = publicationRepository.findById(id).orElseThrow(() -> notFound("Publication introuvable."));
        if (user.getRole() != RoleEnum.ADMIN_SAAS && !publication.getBank().getId().equals(user.getBank().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette publication appartient a une autre banque.");
        }
        if (!List.of(ProductPublicationStatusEnum.APPROVED, ProductPublicationStatusEnum.REJECTED, ProductPublicationStatusEnum.INACTIVE).contains(status)) {
            throw badRequest("Statut de publication invalide.");
        }
        if (status == ProductPublicationStatusEnum.REJECTED && (reason == null || reason.isBlank())) throw badRequest("Le motif de rejet est obligatoire.");
        publication.setStatus(status); publication.setActive(status == ProductPublicationStatusEnum.APPROVED);
        publication.setRejectionReason(reason); publication.setProcessedAt(LocalDateTime.now());
        publication = publicationRepository.save(publication);
        User dealerAdmin = userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(publication.getDealer().getId(), RoleEnum.DEALER_ADMIN).orElse(null);
        if (dealerAdmin != null) {
            String message = "Le produit " + publication.getProduct().getName() + " est maintenant " + status.name().toLowerCase()
                    + " pour " + publication.getBank().getName() + ".";
            notificationService.createNotification("Mise a jour de publication", message,
                    status == ProductPublicationStatusEnum.APPROVED ? NotificationTypeEnum.SUCCESS : NotificationTypeEnum.WARNING,
                    NotificationStatusEnum.UNREAD, publication.getId(), dealerAdmin.getId());
            emailService.sendDealerEventEmail(dealerAdmin.getEmail(), "Publication produit Matchia", "Publication " + status.name().toLowerCase(),
                    message, null, null, reason == null ? "Marketplace" : "Motif", reason == null ? publication.getBank().getName() : reason);
        }
        audit("dealer.publication." + status.name().toLowerCase(), "product_publication", publication.getId());
        return toPublicationView(publication);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.ProductView> publicProducts(String bankSlug, Long storeId) {
        Marketplace marketplace = marketplaceRepository.findByBank_Slug(bankSlug)
                .filter(value -> value.getStatus() == MarketplaceStatusEnum.active)
                .orElseThrow(() -> notFound("Marketplace introuvable."));
        return publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(
                        marketplace.getId(), storeId, ProductPublicationStatusEnum.APPROVED).stream()
                .filter(publication -> publication.getPartnership().getStatus() == DealerPartnershipStatusEnum.ACTIVE)
                .filter(publication -> contractRepository.existsByPartnershipIdAndStatus(
                        publication.getPartnership().getId(), PartnershipContractStatusEnum.ACTIVE))
                .filter(publication -> publication.getProduct().getStatus() == DealerProductStatusEnum.ACTIVE)
                .filter(publication -> publication.getDealer().getStatus() == DealerStatusEnum.ACTIVE)
                .map(ProductPublicationRequest::getProduct).map(this::toProductView).toList();
    }

    @Transactional(readOnly = true)
    public DealerDtos.Dashboard dashboard(Authentication auth) {
        User user = security.requireDealer(auth);
        long dealerId = user.getDealer().getId();
        List<DealerBankPartnership> partnerships = partnershipRepository.findByDealerIdOrderByRequestDateDesc(dealerId);
        List<ProductPublicationRequest> publications = publicationRepository.findByDealerIdOrderBySubmittedAtDesc(dealerId);
        return new DealerDtos.Dashboard(productRepository.findByDealerIdOrderByCreatedAtDesc(dealerId).size(),
                partnerships.stream().filter(p -> p.getStatus() == DealerPartnershipStatusEnum.ACTIVE).count(),
                partnerships.stream().filter(p -> p.getStatus() == DealerPartnershipStatusEnum.PENDING).count(),
                publications.stream().filter(p -> p.getStatus() == ProductPublicationStatusEnum.PENDING).count(),
                publications.stream().filter(p -> p.getStatus() == ProductPublicationStatusEnum.APPROVED && Boolean.TRUE.equals(p.getActive())).count());
    }

    private void apply(DealerProduct product, DealerDtos.ProductUpsert input) {
        product.setName(input.name().trim()); product.setDescription(input.description()); product.setPrice(input.price());
        product.setEligibilityConditions(input.eligibilityConditions());
        product.setStatus(input.status() == null ? DealerProductStatusEnum.DRAFT : input.status());
    }

    private void replaceValues(DealerProduct product, List<DealerDtos.ParameterValue> values) {
        product.getParameterValues().clear();
        // Flush orphan removals before inserting the replacement values. Without this,
        // Hibernate may try to insert a new value before deleting the previous one,
        // violating the unique (product, parameter definition) constraint on update.
        productRepository.saveAndFlush(product);
        if (values == null) return;
        Set<Long> seen = new HashSet<>();
        for (DealerDtos.ParameterValue input : values) {
            if (!seen.add(input.definitionId())) throw badRequest("Une caracteristique est dupliquee.");
            ProductParameterDefinition definition = definitionRepository.findByIdAndStoreId(input.definitionId(), product.getStore().getId())
                    .orElseThrow(() -> badRequest("Caracteristique incompatible avec le store."));
            validateParameterValue(product.getStore(), definition.getName(), input.value());
            DealerProductParameterValue value = new DealerProductParameterValue();
            value.setProduct(product); value.setParameterDefinition(definition); value.setValue(input.value());
            product.getParameterValues().add(value);
        }
    }

    private void validateStore(Dealer dealer, Long storeId) {
        if (!dealer.getStore().getId().equals(storeId)) throw badRequest("Le produit doit appartenir au store du concessionnaire.");
    }

    private String saveImage(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        if (image.getContentType() == null || !image.getContentType().startsWith("image/")) throw badRequest("Le fichier doit etre une image.");
        try {
            String original = Optional.ofNullable(image.getOriginalFilename()).orElse("image");
            String extension = original.contains(".") ? original.substring(original.lastIndexOf('.')).replaceAll("[^.A-Za-z0-9]", "") : "";
            String name = UUID.randomUUID() + extension;
            Path directory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
            Files.createDirectories(directory); Files.copy(image.getInputStream(), directory.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/dealer-products/" + name;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer l'image.", exception);
        }
    }

    private String saveDocument(MultipartFile document) {
        try {
            String original = Optional.ofNullable(document.getOriginalFilename()).orElse("document");
            String extension = original.contains(".") ? original.substring(original.lastIndexOf('.')).replaceAll("[^.A-Za-z0-9]", "") : "";
            String name = UUID.randomUUID() + extension;
            Path directory = Paths.get(documentUploadDirectory).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Files.copy(document.getInputStream(), directory.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/dealer-product-documents/" + name;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le document.", exception);
        }
    }

    private String saveCatalogImage(MultipartFile image) {
        if (image.getContentType() == null || !image.getContentType().startsWith("image/")) {
            throw badRequest("Les fichiers du catalogue doivent être des images.");
        }
        try {
            String original = Optional.ofNullable(image.getOriginalFilename()).orElse("image");
            String extension = original.contains(".") ? original.substring(original.lastIndexOf('.')).replaceAll("[^.A-Za-z0-9]", "") : "";
            String name = UUID.randomUUID() + extension;
            Path directory = Paths.get(catalogUploadDirectory).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Files.copy(image.getInputStream(), directory.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/dealer-product-catalog/" + name;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer l'image du catalogue.", exception);
        }
    }

    private void addCatalogImages(DealerProduct product, List<MultipartFile> files) {
        List<MultipartFile> images = files == null ? List.of() : files.stream()
                .filter(Objects::nonNull).filter(file -> !file.isEmpty()).toList();
        if (images.isEmpty()) return;
        List<DealerProductCatalogImage> existingImages = catalogImageRepository.findByProductIdOrderByDisplayOrderAsc(product.getId());
        if (existingImages.size() + images.size() > MAX_CATALOG_IMAGES) {
            throw badRequest("Le catalogue est limité à " + MAX_CATALOG_IMAGES + " images par produit.");
        }
        int nextDisplayOrder = existingImages.stream().map(DealerProductCatalogImage::getDisplayOrder)
                .filter(Objects::nonNull).max(Integer::compareTo).orElse(0) + 1;
        for (int index = 0; index < images.size(); index++) {
            DealerProductCatalogImage catalogImage = new DealerProductCatalogImage();
            catalogImage.setProduct(product);
            catalogImage.setImageUrl(saveCatalogImage(images.get(index)));
            catalogImage.setDisplayOrder(nextDisplayOrder + index);
            catalogImageRepository.save(catalogImage);
        }
    }

    private void deleteCatalogImages(DealerProduct product, List<Long> imageIds) {
        if (imageIds == null || imageIds.isEmpty()) return;
        for (Long imageId : new LinkedHashSet<>(imageIds)) {
            if (imageId == null) continue;
            DealerProductCatalogImage catalogImage = catalogImageRepository.findByIdAndProductId(imageId, product.getId())
                    .orElseThrow(() -> notFound("Image du catalogue introuvable."));
            deleteCatalogStoredFile(catalogImage.getImageUrl());
            catalogImageRepository.delete(catalogImage);
        }
    }

    private void deleteStoredFile(String publicPath) {
        if (publicPath == null || !publicPath.startsWith("/uploads/dealer-product-documents/")) return;
        try { Files.deleteIfExists(Paths.get(documentUploadDirectory).toAbsolutePath().normalize().resolve(publicPath.substring(publicPath.lastIndexOf('/') + 1))); }
        catch (IOException ignored) { }
    }

    private void deleteCatalogStoredFile(String publicPath) {
        if (publicPath == null || !publicPath.startsWith("/uploads/dealer-product-catalog/")) return;
        try {
            Path directory = Paths.get(catalogUploadDirectory).toAbsolutePath().normalize();
            Files.deleteIfExists(directory.resolve(publicPath.substring(publicPath.lastIndexOf('/') + 1)).normalize());
        } catch (IOException ignored) { }
    }

    private Path documentPath(DealerProductDocument document) {
        Path path = Paths.get(documentUploadDirectory).toAbsolutePath().normalize()
                .resolve(document.getFilePath().substring(document.getFilePath().lastIndexOf('/') + 1)).normalize();
        if (!path.startsWith(Paths.get(documentUploadDirectory).toAbsolutePath().normalize()) || !Files.exists(path)) {
            throw notFound("Fichier introuvable.");
        }
        return path;
    }

    private void validateParameterValue(Store store, String name, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) return;
        StoreProductSchema.StoreType type = StoreProductSchema.typeOf(store.getName());
        boolean positive = StoreProductSchema.requiresPositiveNumber(type, name);
        boolean nonNegative = StoreProductSchema.requiresNonNegativeNumber(type, name);
        if (!positive && !nonNegative) return;
        try {
            double value = Double.parseDouble(rawValue.trim().replace(',', '.'));
            if ((positive && value <= 0) || (nonNegative && value < 0)) throw badRequest("Valeur invalide pour " + name + ".");
        } catch (NumberFormatException exception) {
            throw badRequest("La valeur de " + name + " doit etre numerique.");
        }
    }

    public DealerDtos.ProductView toProductView(DealerProduct product) {
        return toProductView(product, false);
    }

    private DealerDtos.ProductView toDealerProductView(DealerProduct product) {
        return toProductView(product, true);
    }

    private DealerDtos.ProductView toProductView(DealerProduct product, boolean includePrivateDocuments) {
        List<DealerDtos.ParameterValue> values = product.getParameterValues().stream()
                .map(value -> new DealerDtos.ParameterValue(value.getParameterDefinition().getId(), value.getParameterDefinition().getName(), value.getValue())).toList();
        List<DealerDtos.ProductDocumentView> documents = documentRepository.findByProductIdOrderByUploadedAtDesc(product.getId()).stream()
                .filter(document -> includePrivateDocuments || document.isPublicDocument())
                .map(document -> toDocumentView(document, includePrivateDocuments)).toList();
        List<DealerDtos.ProductCatalogImageView> catalogImages = catalogImages(product.getId());
        return new DealerDtos.ProductView(product.getId(), product.getDealer().getId(), product.getDealer().getCompanyName(),
                product.getStore().getId(), product.getStore().getName(), product.getName(), product.getDescription(), product.getPrice(),
                product.getImageUrl(), product.getEligibilityConditions(), product.getStatus(), product.getTotalStock(),
                product.getAvailableStock(), product.getReservedStock(), values, documents, catalogImages, product.getCreatedAt(), product.getUpdatedAt());
    }

    private List<DealerDtos.ProductCatalogImageView> catalogImages(Long productId) {
        return catalogImageRepository.findByProductIdOrderByDisplayOrderAsc(productId).stream()
                .map(image -> new DealerDtos.ProductCatalogImageView(image.getId(), image.getImageUrl(), image.getDisplayOrder()))
                .toList();
    }

    private DealerDtos.ProductDocumentView toDocumentView(DealerProductDocument document) {
        return toDocumentView(document, false);
    }

    private DealerDtos.ProductDocumentView toDocumentView(DealerProductDocument document, boolean dealerView) {
        String url = dealerView
                ? "/api/dealer/products/" + document.getProduct().getId() + "/documents/" + document.getId() + "/download"
                : "/api/public/dealers/products/" + document.getProduct().getId() + "/documents/" + document.getId() + "/download";
        return new DealerDtos.ProductDocumentView(document.getId(), document.getDocumentType(), document.getFileName(),
                url, document.isPublicDocument(), document.getUploadedAt());
    }

    public DealerDtos.PublicationView toPublicationView(ProductPublicationRequest publication) {
        return new DealerDtos.PublicationView(publication.getId(), toProductView(publication.getProduct()),
                publication.getDealer().getId(), publication.getDealer().getCompanyName(), publication.getBank().getId(),
                publication.getBank().getName(), publication.getBank().getLogoUrl(),
                publication.getMarketplace().getId(), publication.getStore().getId(),
                publication.getStore().getName(), publication.getStatus(), Boolean.TRUE.equals(publication.getActive()),
                publication.getRejectionReason(), publication.getSubmittedAt(), publication.getProcessedAt());
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }

    private void audit(String action, String resourceType, Long id) {
        AuditLogRequest log = new AuditLogRequest();
        log.setAction(action); log.setCategory(AuditCategoryEnum.data_config); log.setResourceType(resourceType);
        log.setResourceId(String.valueOf(id)); log.setStatus(AuditStatusEnum.success); log.setSource("dealer-management");
        auditLogger.logAsync(log);
    }
}
