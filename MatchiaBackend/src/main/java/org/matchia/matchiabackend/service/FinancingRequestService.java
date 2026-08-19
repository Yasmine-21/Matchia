package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.FinancingRequestDtos;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.DealerProductStatusEnum;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FinancingRequestService {
    private static final List<Requirement> DEFAULT_REQUIREMENTS = List.of(
            new Requirement("NATIONAL_ID", "Pièce d'identité", true),
            new Requirement("PROOF_OF_ADDRESS", "Justificatif de domicile", true),
            new Requirement("PAYSLIP", "Bulletin de paie", true),
            new Requirement("EMPLOYMENT_CERTIFICATE", "Attestation de travail", true),
            new Requirement("BANK_STATEMENT", "Relevé bancaire", true)
    );

    private final UserRepository userRepository;
    private final BankRepository bankRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final DealerProductRepository dealerProductRepository;
    private final ProductPublicationRequestRepository publicationRepository;
    private final PartnershipContractRepository partnershipContractRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final FinancingRequestRepository requestRepository;
    private final FinancingRequestDocumentRepository documentRepository;
    private final RequiredFinancingDocumentRepository requirementRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Value("${app.financing-upload.dir:uploads/financing-documents}")
    private String financingUploadDir;

    @Transactional(readOnly = true)
    public User currentClient(String email) {
        User user = currentUser(email);
        if (user.getRole() != RoleEnum.CLIENT || user.getBank() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux clients d'une marketplace.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public User currentBankAdmin(String email) {
        User user = currentUser(email);
        if (user.getRole() != RoleEnum.ADMIN_BANK || user.getBank() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux administrateurs banque.");
        }
        return user;
    }

    @Transactional
    public FinancingRequestDtos.DetailDto createDraft(String email, FinancingRequestDtos.CreateRequest input) {
        User client = currentClient(email);
        Store store = storeRepository.findById(input.getStoreId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store introuvable."));
        MarketplaceStore assignment = marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(client.getBank().getId(), store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce store n'est pas disponible sur votre marketplace."));
        if (!Boolean.TRUE.equals(assignment.getEnabled()) || !Boolean.TRUE.equals(assignment.getVisible())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce store n'est pas actif sur votre marketplace.");
        }
        FinancingRequest request = new FinancingRequest();
        request.setReference(nextReference());
        request.setClient(client);
        request.setBank(client.getBank());
        request.setStore(store);
        if (input.getDealerProductId() != null) {
            request.setDealerProduct(publishedDealerProduct(input.getDealerProductId(), client, store));
        } else {
            Product product = productRepository.findById(input.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produit introuvable."));
            if (!Objects.equals(product.getStore().getId(), store.getId()) || !Objects.equals(product.getBank().getId(), client.getBank().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le produit sélectionné ne correspond pas à cette marketplace.");
            }
            request.setProduct(product);
        }
        request.setStatus(FinancingRequestStatusEnum.DRAFT);
        applySimulation(input, request);
        return toDetail(requestRepository.save(request));
    }

    @Transactional
    public FinancingRequestDtos.DetailDto submit(String email, Long requestId) {
        User client = currentClient(email);
        FinancingRequest request = ownedRequest(client, requestId);
        if (request.getStatus() != FinancingRequestStatusEnum.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seule une demande brouillon peut être soumise.");
        }
        if (request.getDealerProduct() != null) {
            publishedDealerProduct(request.getDealerProduct().getId(), client, request.getStore());
        }
        Set<String> uploadedTypes = request.getDocuments().stream().map(FinancingRequestDocument::getDocumentType).collect(java.util.stream.Collectors.toSet());
        List<String> missing = requirementsFor(request.getBank().getId(), request.getStore().getId()).stream()
                .filter(FinancingRequestDtos.DocumentRequirementDto::isRequired)
                .filter(requirement -> !uploadedTypes.contains(requirement.getDocumentType()))
                .map(FinancingRequestDtos.DocumentRequirementDto::getLabel).toList();
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Documents requis manquants : " + String.join(", ", missing));
        }
        request.setStatus(FinancingRequestStatusEnum.PENDING);
        FinancingRequest submitted = requestRepository.saveAndFlush(request);
        notificationService.createBankFinancingRequestSubmittedNotification(submitted);
        return toDetail(submitted);
    }

    @Transactional(readOnly = true)
    public List<FinancingRequestDtos.SummaryDto> clientRequests(String email) {
        User client = currentClient(email);
        return requestRepository.findByClient_IdOrderByCreatedAtDesc(client.getId()).stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public FinancingRequestDtos.DetailDto clientRequest(String email, Long id) {
        return toDetail(ownedRequest(currentClient(email), id));
    }

    @Transactional(readOnly = true)
    public FinancingRequestDtos.DashboardDto clientDashboard(String email) {
        User client = currentClient(email);
        FinancingRequestDtos.DashboardDto result = new FinancingRequestDtos.DashboardDto();
        result.setTotal(requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.DRAFT)
                + requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.PENDING)
                + requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.ACCEPTED)
                + requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.REJECTED));
        result.setPending(requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.PENDING));
        result.setAccepted(requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.ACCEPTED));
        result.setRejected(requestRepository.countByClient_IdAndStatus(client.getId(), FinancingRequestStatusEnum.REJECTED));
        result.setRecent(requestRepository.findByClient_IdOrderByCreatedAtDesc(client.getId()).stream().limit(5).map(this::toSummary).toList());
        return result;
    }

    /**
     * Ensures that decisions taken before the client opened the notification
     * center are represented there as well. Creation is idempotent in
     * NotificationService, so polling this method cannot duplicate items.
     */
    @Transactional
    public void ensureClientDecisionNotifications(String email) {
        User client = currentClient(email);
        requestRepository.findByClient_IdOrderByCreatedAtDesc(client.getId()).stream()
                .filter(request -> request.getStatus() == FinancingRequestStatusEnum.ACCEPTED
                        || request.getStatus() == FinancingRequestStatusEnum.REJECTED)
                .forEach(notificationService::createFinancingDecisionNotification);
    }

    @Transactional
    public FinancingRequestDtos.DocumentDto uploadDocument(String email, Long requestId, String documentType, MultipartFile file) {
        FinancingRequest request = ownedRequest(currentClient(email), requestId);
        assertDocumentsEditable(request);
        String normalizedType = normalizeType(documentType);
        if (requirementsFor(request.getBank().getId(), request.getStore().getId()).stream().noneMatch(item -> item.getDocumentType().equals(normalizedType))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de document non attendu.");
        }
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier est obligatoire et limité à 5 Mo.");
        }
        String safeOriginal = Optional.ofNullable(file.getOriginalFilename()).orElse("document").replaceAll("[^A-Za-z0-9._-]", "_");
        String stored = UUID.randomUUID() + "_" + safeOriginal;
        try {
            Path dir = Paths.get(financingUploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
            FinancingRequestDocument document = documentRepository.findByFinancingRequest_IdAndDocumentType(requestId, normalizedType).orElse(null);
            if (document != null) deleteStoredFile(document.getStoredFilename()); else {
                document = new FinancingRequestDocument();
                document.setFinancingRequest(request);
                document.setDocumentType(normalizedType);
            }
            document.setOriginalFilename(safeOriginal);
            document.setStoredFilename(stored);
            document.setContentType(file.getContentType());
            document.setFileSize(file.getSize());
            return toDocument(documentRepository.save(document));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le document.");
        }
    }

    @Transactional
    public void deleteDocument(String email, Long requestId, Long documentId) {
        FinancingRequest request = ownedRequest(currentClient(email), requestId);
        assertDocumentsEditable(request);
        FinancingRequestDocument document = documentRepository.findByIdAndFinancingRequest_Id(documentId, requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable."));
        deleteStoredFile(document.getStoredFilename());
        documentRepository.delete(document);
    }

    @Transactional(readOnly = true)
    public Resource documentForClient(String email, Long requestId, Long documentId) {
        FinancingRequest request = ownedRequest(currentClient(email), requestId);
        return resource(documentRepository.findByIdAndFinancingRequest_Id(documentId, request.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable.")));
    }

    @Transactional(readOnly = true)
    public List<FinancingRequestDtos.SummaryDto> bankRequests(String email, Long storeId, String status, String search) {
        User admin = currentBankAdmin(email);
        verifyActiveBankStore(admin.getBank().getId(), storeId);
        return requestRepository.findByBank_IdAndStore_IdOrderByCreatedAtDesc(admin.getBank().getId(), storeId).stream()
                .filter(request -> status == null || status.isBlank() || request.getStatus().name().equalsIgnoreCase(status))
                .filter(request -> search == null || search.isBlank() || matches(request, search))
                .map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public FinancingRequestDtos.DetailDto bankRequest(String email, Long id) {
        User admin = currentBankAdmin(email);
        return toDetail(bankRequest(admin, id));
    }

    @Transactional
    public FinancingRequestDtos.DetailDto process(String email, Long id, FinancingRequestDtos.ProcessRequest input) {
        User admin = currentBankAdmin(email);
        FinancingRequest request = bankRequest(admin, id);
        if (request.getStatus() != FinancingRequestStatusEnum.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seule une demande en attente peut être traitée.");
        }
        if (input.getStatus() != FinancingRequestStatusEnum.ACCEPTED && input.getStatus() != FinancingRequestStatusEnum.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La décision doit être ACCEPTED ou REJECTED.");
        }
        if (input.getStatus() == FinancingRequestStatusEnum.REJECTED && (input.getRejectionReason() == null || input.getRejectionReason().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un motif de rejet est obligatoire.");
        }
        request.setStatus(input.getStatus());
        request.setProcessingComment(trim(input.getComment()));
        request.setRejectionReason(input.getStatus() == FinancingRequestStatusEnum.REJECTED ? trim(input.getRejectionReason()) : null);
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(admin);
        // Persist the decision before its non-critical delivery side effects.
        FinancingRequest saved = requestRepository.saveAndFlush(request);
        notificationService.createFinancingDecisionNotification(saved);
        try {
            emailService.sendFinancingDecisionEmail(saved);
        } catch (RuntimeException exception) {
            // A delivery failure must never undo a bank decision.
            log.warn("Financing decision email could not be sent for {}.", saved.getReference(), exception);
        }
        return toDetail(saved);
    }

    @Transactional(readOnly = true)
    public List<ClientProfileDto> bankClients(String email) {
        User admin = currentBankAdmin(email);
        return userRepository.findByBank_IdOrderByCreatedAtAsc(admin.getBank().getId()).stream()
                .filter(user -> user.getRole() == RoleEnum.CLIENT).map(user -> {
                    ClientProfileDto dto = toClientProfile(user);
                    dto.setFinancingRequestCount(requestRepository.countByClient_Id(user.getId()));
                    return dto;
                }).toList();
    }

    @Transactional(readOnly = true)
    public ClientProfileDto bankClient(String email, Long clientId) {
        User admin = currentBankAdmin(email);
        User client = userRepository.findById(clientId).filter(user -> user.getRole() == RoleEnum.CLIENT
                && user.getBank() != null && Objects.equals(user.getBank().getId(), admin.getBank().getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client introuvable."));
        ClientProfileDto dto = toClientProfile(client);
        dto.setFinancingRequestCount(requestRepository.countByClient_Id(client.getId()));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<FinancingRequestDtos.SummaryDto> bankClientRequests(String email, Long clientId) {
        User admin = currentBankAdmin(email);
        bankClient(email, clientId);
        return requestRepository.findByBank_IdAndClient_IdOrderByCreatedAtDesc(admin.getBank().getId(), clientId).stream()
                .map(this::toSummary).toList();
    }

    @Transactional
    public ClientProfileDto updateClientProfile(String email, ClientProfileDto input) {
        User client = currentClient(email);
        client.setFullName(trimRequired(input.getFullName(), "Le nom est obligatoire."));
        client.setPhone(trimRequired(input.getPhone(), "Le téléphone est obligatoire."));
        client.setAddress(trimRequired(input.getAddress(), "L'adresse est obligatoire."));
        client.setBirthDate(input.getBirthDate());
        client.setContactImageUrl(input.getContactImageUrl());
        return toClientProfile(userRepository.save(client));
    }

    @Transactional(readOnly = true)
    public List<FinancingRequestDtos.DocumentRequirementDto> requirementsForClient(String email, Long storeId) {
        User client = currentClient(email);
        verifyActiveBankStore(client.getBank().getId(), storeId);
        return requirementsFor(client.getBank().getId(), storeId);
    }

    @Transactional(readOnly = true)
    public Resource documentForBank(String email, Long requestId, Long documentId) {
        FinancingRequest request = bankRequest(currentBankAdmin(email), requestId);
        return resource(documentRepository.findByIdAndFinancingRequest_Id(documentId, request.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable.")));
    }

    private User currentUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable."));
    }
    private FinancingRequest ownedRequest(User client, Long id) {
        return requestRepository.findByIdAndClient_Id(id, client.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
    }
    private FinancingRequest bankRequest(User admin, Long id) {
        FinancingRequest request = requestRepository.findByIdAndBank_Id(id, admin.getBank().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        verifyActiveBankStore(admin.getBank().getId(), request.getStore().getId());
        return request;
    }
    private void verifyActiveBankStore(Long bankId, Long storeId) {
        MarketplaceStore assignment = marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(bankId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store introuvable pour cette banque."));
        if (!Boolean.TRUE.equals(assignment.getEnabled()) || !Boolean.TRUE.equals(assignment.getVisible())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce store n'est pas actif.");
        }
    }
    private DealerProduct publishedDealerProduct(Long dealerProductId, User client, Store store) {
        DealerProduct dealerProduct = dealerProductRepository.findById(dealerProductId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produit concessionnaire introuvable."));
        if (!Objects.equals(dealerProduct.getStore().getId(), store.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le produit concessionnaire ne correspond pas au store sélectionné.");
        }
        ProductPublicationRequest publication = publicationRepository
                .findByProductIdAndBankIdAndStoreId(dealerProductId, client.getBank().getId(), store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce produit concessionnaire n'est pas publié sur votre marketplace."));
        boolean published = publication.getStatus() == ProductPublicationStatusEnum.APPROVED
                && Boolean.TRUE.equals(publication.getActive())
                && publication.getPartnership().getStatus() == DealerPartnershipStatusEnum.ACTIVE
                && partnershipContractRepository.existsByPartnershipIdAndStatus(publication.getPartnership().getId(), PartnershipContractStatusEnum.ACTIVE)
                && dealerProduct.getStatus() == DealerProductStatusEnum.ACTIVE
                && dealerProduct.getDealer().getStatus() == DealerStatusEnum.ACTIVE;
        if (!published) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce produit concessionnaire n'est plus disponible pour le financement.");
        }
        return dealerProduct;
    }
    private void assertDocumentsEditable(FinancingRequest request) {
        if (request.getStatus() != FinancingRequestStatusEnum.DRAFT && request.getStatus() != FinancingRequestStatusEnum.PENDING) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Les documents ne peuvent plus être modifiés.");
        }
    }
    private List<FinancingRequestDtos.DocumentRequirementDto> requirementsFor(Long bankId, Long storeId) {
        List<RequiredFinancingDocument> configured = requirementRepository.findByBank_IdAndStore_IdAndActiveTrueOrderByIdAsc(bankId, storeId);
        if (configured.isEmpty()) return DEFAULT_REQUIREMENTS.stream().map(this::toRequirement).toList();
        return configured.stream().map(item -> requirement(item.getDocumentType(), item.getLabel(), item.isRequired())).toList();
    }
    private FinancingRequestDtos.DocumentRequirementDto toRequirement(Requirement item) { return requirement(item.type(), item.label(), item.required()); }
    private FinancingRequestDtos.DocumentRequirementDto requirement(String type, String label, boolean required) {
        FinancingRequestDtos.DocumentRequirementDto dto = new FinancingRequestDtos.DocumentRequirementDto(); dto.setDocumentType(type); dto.setLabel(label); dto.setRequired(required); return dto;
    }
    private void applySimulation(FinancingRequestDtos.CreateRequest input, FinancingRequest request) {
        request.setRequestedAmount(positive(input.getRequestedAmount())); request.setMonthlyPayment(positive(input.getMonthlyPayment()));
        request.setDownPayment(positive(input.getDownPayment())); request.setDurationMonths(input.getDurationMonths());
        request.setAnnualRate(positive(input.getAnnualRate())); request.setSimulationData(input.getSimulationData());
    }
    private BigDecimal positive(BigDecimal value) { return value != null && value.signum() >= 0 ? value : null; }
    private String nextReference() { return "FIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(); }
    private boolean matches(FinancingRequest request, String search) { String needle = search.trim().toLowerCase(); return request.getReference().toLowerCase().contains(needle) || request.getClient().getFullName().toLowerCase().contains(needle) || financedProductName(request).toLowerCase().contains(needle); }
    private String normalizeType(String value) { if (value == null || !value.matches("[A-Za-z0-9_-]{1,100}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de document invalide."); return value.toUpperCase(); }
    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String trimRequired(String value, String message) { String trimmed = trim(value); if (trimmed == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); return trimmed; }
    private void deleteStoredFile(String filename) { try { if (filename != null) Files.deleteIfExists(Paths.get(financingUploadDir).toAbsolutePath().normalize().resolve(filename).normalize()); } catch (IOException ignored) { } }
    private Resource resource(FinancingRequestDocument document) { try { Path file = Paths.get(financingUploadDir).toAbsolutePath().normalize().resolve(document.getStoredFilename()).normalize(); Resource resource = new UrlResource(file.toUri()); if (!resource.exists() || !resource.isReadable()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable."); return resource; } catch (MalformedURLException e) { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable."); } }
    public static ClientProfileDto toClientProfile(User user) { ClientProfileDto dto = new ClientProfileDto(); dto.setId(user.getId()); dto.setFullName(user.getFullName()); dto.setEmail(user.getEmail()); dto.setPhone(user.getPhone()); dto.setAddress(user.getAddress()); dto.setBirthDate(user.getBirthDate()); dto.setContactImageUrl(user.getContactImageUrl()); dto.setBankName(user.getBank() != null ? user.getBank().getName() : null); dto.setStatus(user.getStatus()); return dto; }
    private boolean isDealerProduct(FinancingRequest request) { return request.getDealerProduct() != null; }
    private Long financedProductId(FinancingRequest request) { return isDealerProduct(request) ? request.getDealerProduct().getId() : request.getProduct().getId(); }
    private String financedProductName(FinancingRequest request) { return isDealerProduct(request) ? request.getDealerProduct().getName() : request.getProduct().getName(); }
    private String financedProductImageUrl(FinancingRequest request) { return isDealerProduct(request) ? request.getDealerProduct().getImageUrl() : request.getProduct().getImageUrl(); }
    private BigDecimal financedProductPrice(FinancingRequest request) { return isDealerProduct(request) ? request.getDealerProduct().getPrice() : request.getProduct().getPrice(); }
    private FinancingRequestDtos.SummaryDto toSummary(FinancingRequest request) { FinancingRequestDtos.SummaryDto dto = new FinancingRequestDtos.SummaryDto(); dto.setId(request.getId()); dto.setReference(request.getReference()); dto.setClientId(request.getClient().getId()); dto.setClientName(request.getClient().getFullName()); dto.setProductId(financedProductId(request)); dto.setDealerProduct(isDealerProduct(request)); dto.setProductName(financedProductName(request)); dto.setProductImageUrl(financedProductImageUrl(request)); dto.setProductPrice(financedProductPrice(request)); dto.setStoreId(request.getStore().getId()); dto.setStoreName(request.getStore().getName()); dto.setRequestedAmount(request.getRequestedAmount()); dto.setMonthlyPayment(request.getMonthlyPayment()); dto.setStatus(request.getStatus()); dto.setCreatedAt(request.getCreatedAt()); return dto; }
    private FinancingRequestDtos.DetailDto toDetail(FinancingRequest request) { FinancingRequestDtos.DetailDto dto = new FinancingRequestDtos.DetailDto(); FinancingRequestDtos.SummaryDto summary = toSummary(request); dto.setId(summary.getId()); dto.setReference(summary.getReference()); dto.setClientId(summary.getClientId()); dto.setClientName(summary.getClientName()); dto.setProductId(summary.getProductId()); dto.setDealerProduct(summary.isDealerProduct()); dto.setProductName(summary.getProductName()); dto.setProductImageUrl(summary.getProductImageUrl()); dto.setProductPrice(summary.getProductPrice()); dto.setStoreId(summary.getStoreId()); dto.setStoreName(summary.getStoreName()); dto.setRequestedAmount(summary.getRequestedAmount()); dto.setMonthlyPayment(summary.getMonthlyPayment()); dto.setStatus(summary.getStatus()); dto.setCreatedAt(summary.getCreatedAt()); dto.setBankId(request.getBank().getId()); dto.setBankName(request.getBank().getName()); dto.setDownPayment(request.getDownPayment()); dto.setDurationMonths(request.getDurationMonths()); dto.setAnnualRate(request.getAnnualRate()); dto.setSimulationData(request.getSimulationData()); dto.setProcessingComment(request.getProcessingComment()); dto.setRejectionReason(request.getRejectionReason()); dto.setProcessedAt(request.getProcessedAt()); dto.setProcessedByName(request.getProcessedBy() != null ? request.getProcessedBy().getFullName() : null); dto.setClient(toClientProfile(request.getClient())); dto.setDocuments(request.getDocuments().stream().map(this::toDocument).toList()); return dto; }
    private FinancingRequestDtos.DocumentDto toDocument(FinancingRequestDocument document) { FinancingRequestDtos.DocumentDto dto = new FinancingRequestDtos.DocumentDto(); dto.setId(document.getId()); dto.setDocumentType(document.getDocumentType()); dto.setOriginalFilename(document.getOriginalFilename()); dto.setContentType(document.getContentType()); dto.setFileSize(document.getFileSize()); dto.setUploadedAt(document.getUploadedAt()); return dto; }
    private record Requirement(String type, String label, boolean required) { }
}
