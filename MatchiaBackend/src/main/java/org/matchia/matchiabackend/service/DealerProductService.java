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
    private final DealerBankPartnershipRepository partnershipRepository;
    private final ProductParameterDefinitionRepository definitionRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final DealerSecurityService security;
    private final DealerAccountService accountService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;

    @Value("${app.dealer.product.upload.dir:uploads/dealer-products}") private String uploadDirectory;

    @Transactional(readOnly = true)
    public List<DealerDtos.ProductView> mine(Authentication auth) {
        User user = security.requireDealer(auth);
        return productRepository.findByDealerIdOrderByCreatedAtDesc(user.getDealer().getId()).stream().map(this::toProductView).toList();
    }

    @Transactional
    public DealerDtos.ProductView create(Authentication auth, DealerDtos.ProductUpsert input, MultipartFile image) {
        User user = security.requireDealer(auth);
        Dealer dealer = user.getDealer();
        validateStore(dealer, input.storeId());
        DealerProduct product = new DealerProduct();
        product.setDealer(dealer); product.setStore(dealer.getStore());
        apply(product, input);
        product.setImageUrl(saveImage(image));
        product = productRepository.save(product);
        replaceValues(product, input.parameterValues());
        audit("dealer.product.created", "dealer_product", product.getId());
        return toProductView(productRepository.findByIdAndDealerId(product.getId(), dealer.getId()).orElseThrow());
    }

    @Transactional
    public DealerDtos.ProductView update(Authentication auth, Long id, DealerDtos.ProductUpsert input, MultipartFile image) {
        User user = security.requireDealer(auth);
        DealerProduct product = productRepository.findByIdAndDealerId(id, user.getDealer().getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        validateStore(user.getDealer(), input.storeId());
        apply(product, input);
        if (image != null && !image.isEmpty()) product.setImageUrl(saveImage(image));
        replaceValues(product, input.parameterValues());
        DealerProduct saved = productRepository.save(product);
        audit("dealer.product.updated", "dealer_product", saved.getId());
        return toProductView(saved);
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
    public DealerDtos.PublicationView submit(Authentication auth, DealerDtos.PublicationCreate input) {
        User user = security.requireDealer(auth);
        Dealer dealer = user.getDealer();
        DealerProduct product = productRepository.findByIdAndDealerId(input.productId(), dealer.getId())
                .orElseThrow(() -> notFound("Produit introuvable."));
        if (product.getStatus() != DealerProductStatusEnum.ACTIVE) throw badRequest("Activez le produit avant de le soumettre.");
        DealerBankPartnership partnership = partnershipRepository.findById(input.partnershipId())
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getDealer().getId().equals(dealer.getId()) || partnership.getStatus() != DealerPartnershipStatusEnum.APPROVED) {
            throw badRequest("Le partenariat selectionne n'est pas approuve.");
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
                .filter(publication -> publication.getPartnership().getStatus() == DealerPartnershipStatusEnum.APPROVED)
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
                partnerships.stream().filter(p -> p.getStatus() == DealerPartnershipStatusEnum.APPROVED).count(),
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
        if (values == null) return;
        Set<Long> seen = new HashSet<>();
        for (DealerDtos.ParameterValue input : values) {
            if (!seen.add(input.definitionId())) throw badRequest("Une caracteristique est dupliquee.");
            ProductParameterDefinition definition = definitionRepository.findByIdAndStoreId(input.definitionId(), product.getStore().getId())
                    .orElseThrow(() -> badRequest("Caracteristique incompatible avec le store."));
            DealerProductParameterValue value = new DealerProductParameterValue();
            value.setProduct(product); value.setParameterDefinition(definition); value.setValue(input.value());
            product.getParameterValues().add(value);
        }
        productRepository.save(product);
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

    public DealerDtos.ProductView toProductView(DealerProduct product) {
        List<DealerDtos.ParameterValue> values = product.getParameterValues().stream()
                .map(value -> new DealerDtos.ParameterValue(value.getParameterDefinition().getId(), value.getParameterDefinition().getName(), value.getValue())).toList();
        return new DealerDtos.ProductView(product.getId(), product.getDealer().getId(), product.getDealer().getCompanyName(),
                product.getStore().getId(), product.getStore().getName(), product.getName(), product.getDescription(), product.getPrice(),
                product.getImageUrl(), product.getEligibilityConditions(), product.getStatus(), values, product.getCreatedAt(), product.getUpdatedAt());
    }

    public DealerDtos.PublicationView toPublicationView(ProductPublicationRequest publication) {
        return new DealerDtos.PublicationView(publication.getId(), toProductView(publication.getProduct()),
                publication.getDealer().getId(), publication.getDealer().getCompanyName(), publication.getBank().getId(),
                publication.getBank().getName(), publication.getMarketplace().getId(), publication.getStore().getId(),
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
