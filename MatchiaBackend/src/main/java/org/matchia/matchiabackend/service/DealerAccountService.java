package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class DealerAccountService {
    private final DealerAccountRequestRepository requestRepository;
    private final DealerRepository dealerRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final DealerSecurityService security;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;

    @Value("${app.dealer.upload.dir:uploads/dealers}") private String uploadDirectory;
    @Value("${app.frontend.url:http://lvh.me:5173}") private String frontendUrl;

    @Transactional
    public DealerDtos.AccountRequestView register(DealerDtos.RegistrationRequest input, MultipartFile logo,
                                                   List<MultipartFile> documents) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        if (logo == null || logo.isEmpty()) throw badRequest("Le logo est obligatoire.");
        if (documents == null || documents.stream().allMatch(file -> file == null || file.isEmpty())) {
            throw badRequest("Au moins un document justificatif est obligatoire.");
        }
        validateUpload(logo, true);
        documents.stream().filter(file -> file != null && !file.isEmpty()).forEach(file -> validateUpload(file, false));
        if (userRepository.existsByEmailIgnoreCase(email) || dealerRepository.existsByEmailIgnoreCase(email)
                || requestRepository.existsByEmailIgnoreCaseAndStatus(email, DealerRequestStatusEnum.PENDING)) {
            throw badRequest("Cette adresse e-mail est deja utilisee ou possede une demande en attente.");
        }
        if (dealerRepository.existsByRegistrationNumberIgnoreCase(input.registrationNumber().trim())) {
            throw badRequest("Ce numero d'immatriculation est deja utilise.");
        }
        Store store = storeRepository.findById(input.storeId()).orElseThrow(() -> badRequest("Store introuvable."));
        if (store.getStatus() != StoreStatusEnum.active) throw badRequest("Le store selectionne est inactif.");

        DealerAccountRequest request = new DealerAccountRequest();
        request.setCompanyName(input.companyName().trim());
        request.setRegistrationNumber(input.registrationNumber().trim());
        request.setAddress(input.address().trim());
        request.setContactPerson(input.contactPerson().trim());
        request.setEmail(email);
        request.setPhone(input.phone().trim());
        request.setStore(store);
        request.setStatus(DealerRequestStatusEnum.PENDING);
        request.setLogoUrl(saveFile(logo, "logos"));
        request.setDocumentUrls(documents.stream().filter(file -> file != null && !file.isEmpty())
                .map(file -> saveFile(file, "documents")).toList());
        DealerAccountRequest saved = requestRepository.save(request);

        notificationService.createNotification("Nouvelle demande concessionnaire",
                saved.getCompanyName() + " a envoye une demande de creation de compte concessionnaire.",
                NotificationTypeEnum.INFO, NotificationStatusEnum.UNREAD, saved.getId(), null);
        emailService.sendDealerEventEmail(email, "Demande concessionnaire recue", "Demande recue",
                "Votre demande de compte concessionnaire a ete enregistree et sera examinee par notre equipe.",
                null, null, "Statut de la demande", "En attente");
        audit("dealer.request.submitted", "dealer_request", saved.getId(), AuditStatusEnum.success);
        return toRequestView(saved);
    }

    @Transactional(readOnly = true)
    public Page<DealerDtos.AccountRequestView> search(Authentication auth, DealerRequestStatusEnum status,
                                                       String search, Long storeId, LocalDateTime from, LocalDateTime to,
                                                       Pageable pageable) {
        security.requireSaas(auth);
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        Specification<DealerAccountRequest> filters = (root, query, criteria) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (status != null) predicates.add(criteria.equal(root.get("status"), status));
            if (storeId != null) predicates.add(criteria.equal(root.get("store").get("id"), storeId));
            if (from != null) predicates.add(criteria.greaterThanOrEqualTo(root.get("submittedAt"), from));
            if (to != null) predicates.add(criteria.lessThanOrEqualTo(root.get("submittedAt"), to));
            if (!term.isBlank()) {
                String pattern = "%" + term + "%";
                predicates.add(criteria.or(
                        criteria.like(criteria.lower(root.get("companyName")), pattern),
                        criteria.like(criteria.lower(root.get("registrationNumber")), pattern),
                        criteria.like(criteria.lower(root.get("contactPerson")), pattern),
                        criteria.like(criteria.lower(root.get("email")), pattern),
                        criteria.like(criteria.lower(root.get("store").get("name")), pattern)
                ));
            }
            return criteria.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return requestRepository.findAll(filters, pageable).map(this::toRequestView);
    }

    @Transactional
    public DealerDtos.DealerView approve(Authentication auth, Long requestId) {
        security.requireSaas(auth);
        DealerAccountRequest request = pendingRequest(requestId);
        if (dealerRepository.existsByEmailIgnoreCase(request.getEmail()) || userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw badRequest("Un compte utilise deja cette adresse e-mail.");
        }
        Dealer dealer = new Dealer();
        dealer.setCompanyName(request.getCompanyName());
        dealer.setRegistrationNumber(request.getRegistrationNumber());
        dealer.setAddress(request.getAddress());
        dealer.setContactPerson(request.getContactPerson());
        dealer.setEmail(request.getEmail());
        dealer.setPhone(request.getPhone());
        dealer.setLogoUrl(request.getLogoUrl());
        dealer.setStore(request.getStore());
        dealer.setStatus(DealerStatusEnum.ACTIVE);
        dealer = dealerRepository.save(dealer);

        String password = passwordService.generateTemporaryPassword();
        User admin = new User();
        admin.setDealer(dealer);
        admin.setFullName(request.getContactPerson());
        admin.setEmail(request.getEmail());
        admin.setPhone(request.getPhone());
        admin.setAddress(request.getAddress());
        admin.setContactImageUrl(request.getLogoUrl());
        admin.setRole(RoleEnum.DEALER_ADMIN);
        admin.setStatus(UserStatusEnum.active);
        passwordService.setPassword(admin, password);
        admin = userRepository.save(admin);

        request.setStatus(DealerRequestStatusEnum.APPROVED);
        request.setProcessedAt(LocalDateTime.now());
        requestRepository.save(request);
        notificationService.createNotification("Compte concessionnaire approuve",
                "Votre compte concessionnaire est actif.", NotificationTypeEnum.SUCCESS,
                NotificationStatusEnum.UNREAD, request.getId(), admin.getId());
        emailService.sendDealerCredentialsEmail(admin.getEmail(), password,
                frontendUrl.replaceAll("/+$", "") + "/connexion");
        audit("dealer.request.approved", "dealer", dealer.getId(), AuditStatusEnum.success);
        return toDealerView(dealer);
    }

    @Transactional
    public DealerDtos.AccountRequestView reject(Authentication auth, Long requestId, String reason) {
        security.requireSaas(auth);
        if (reason == null || reason.isBlank()) throw badRequest("Le motif de rejet est obligatoire.");
        DealerAccountRequest request = pendingRequest(requestId);
        request.setStatus(DealerRequestStatusEnum.REJECTED);
        request.setRejectionReason(reason.trim());
        request.setProcessedAt(LocalDateTime.now());
        requestRepository.save(request);
        emailService.sendDealerEventEmail(request.getEmail(), "Demande concessionnaire rejetee", "Demande rejetee",
                "Votre demande de compte concessionnaire n'a pas ete retenue.", null, null,
                "Motif du rejet", reason.trim());
        audit("dealer.request.rejected", "dealer_request", request.getId(), AuditStatusEnum.success);
        return toRequestView(request);
    }

    @Transactional(readOnly = true)
    public DealerDtos.DealerView me(Authentication auth) {
        User user = security.requireDealer(auth);
        return toDealerView(user.getDealer());
    }

    @Transactional(readOnly = true)
    public Path document(Authentication auth, Long requestId, int index) {
        security.requireSaas(auth);
        DealerAccountRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        if (index < 0 || index >= request.getDocumentUrls().size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable.");
        }
        String storedUrl = request.getDocumentUrls().get(index);
        String fileName = Paths.get(storedUrl).getFileName().toString();
        Path base = Paths.get(uploadDirectory, "documents").toAbsolutePath().normalize();
        Path file = base.resolve(fileName).normalize();
        if (!file.startsWith(base) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable.");
        }
        return file;
    }

    private DealerAccountRequest pendingRequest(Long id) {
        DealerAccountRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        if (request.getStatus() != DealerRequestStatusEnum.PENDING) throw badRequest("Cette demande a deja ete traitee.");
        return request;
    }

    private String saveFile(MultipartFile file, String category) {
        try {
            String original = Optional.ofNullable(file.getOriginalFilename()).orElse("file");
            String extension = original.contains(".") ? original.substring(original.lastIndexOf('.')).replaceAll("[^.A-Za-z0-9]", "") : "";
            String name = UUID.randomUUID() + extension;
            Path directory = Paths.get(uploadDirectory, category).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Files.copy(file.getInputStream(), directory.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/dealers/" + category + "/" + name;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le fichier.", exception);
        }
    }

    public DealerDtos.DealerView toDealerView(Dealer dealer) {
        return new DealerDtos.DealerView(dealer.getId(), dealer.getCompanyName(), dealer.getRegistrationNumber(),
                dealer.getAddress(), dealer.getContactPerson(), dealer.getEmail(), dealer.getPhone(), dealer.getLogoUrl(),
                dealer.getStore().getId(), dealer.getStore().getName(), dealer.getStatus(), dealer.getCreatedAt());
    }

    public DealerDtos.AccountRequestView toRequestView(DealerAccountRequest request) {
        List<String> protectedDocuments = IntStream.range(0, request.getDocumentUrls().size())
                .mapToObj(index -> "/api/saas/dealers/requests/" + request.getId() + "/documents/" + index)
                .toList();
        return new DealerDtos.AccountRequestView(request.getId(), request.getCompanyName(), request.getRegistrationNumber(),
                request.getAddress(), request.getContactPerson(), request.getEmail(), request.getPhone(), request.getLogoUrl(),
                request.getStore().getId(), request.getStore().getName(), protectedDocuments, request.getStatus(),
                request.getRejectionReason(), request.getSubmittedAt(), request.getProcessedAt());
    }

    private void validateUpload(MultipartFile file, boolean imageOnly) {
        long maxBytes = imageOnly ? 5L * 1024 * 1024 : 10L * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw badRequest(imageOnly ? "Le logo ne doit pas depasser 5 Mo." : "Un document ne doit pas depasser 10 Mo.");
        }
        String type = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        boolean allowed = imageOnly ? type.startsWith("image/") : type.startsWith("image/") || type.equals("application/pdf");
        if (!allowed) {
            throw badRequest(imageOnly ? "Le logo doit etre une image." : "Les justificatifs doivent etre des images ou des fichiers PDF.");
        }
    }

    private void audit(String action, String type, Long id, AuditStatusEnum status) {
        AuditLogRequest log = new AuditLogRequest();
        log.setAction(action); log.setCategory(AuditCategoryEnum.data_config); log.setResourceType(type);
        log.setResourceId(String.valueOf(id)); log.setStatus(status); log.setSource("dealer-management");
        auditLogger.logAsync(log);
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
