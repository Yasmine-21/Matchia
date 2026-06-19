package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.Hibernate;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.RequestModuleSelectionDto;
import org.matchia.matchiabackend.dto.RequestStoreSelectionDto;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.security.SecureRandom;
import java.time.Year;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestService {

    private static final Pattern MARKETPLACE_SLUG_PATTERN = Pattern.compile("^[a-z0-9-]+$");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RequestRepository requestRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final EmailService emailService;
    private final PaymentService paymentService;
    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    private final AuditLogger auditLogger;
    private final NotificationService notificationService;

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    // ─── Appelées depuis le contrôleur ───────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Request> findAll() {
        return requestRepository.findAll().stream()
                .peek(this::initializeRequestSelections)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Request> findById(Long id) {
        return requestRepository.findById(id)
                .map(request -> {
                    initializeRequestSelections(request);
                    return request;
                });
    }

    @Transactional(readOnly = true)
    public List<Request> findPendingRequests() {
        return requestRepository.findByStatusOrderByCreatedAtDesc(RequestStatusEnum.pending).stream()
                .peek(this::initializeRequestSelections)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Request> findByBankId(Long bankId) {
        return requestRepository.findByBank_IdOrderByCreatedAtDesc(bankId).stream()
                .peek(this::initializeRequestSelections)
                .toList();
    }

    public Request save(Request request) {
        return requestRepository.save(request);
    }

    public void deleteById(Long id) {
        requestRepository.deleteById(id);
    }

    // ─── Logique métier ───────────────────────────────────────────────────────

    @Transactional
    public Request createJsonRequest(RequestDto dto) {
        List<Long> storeIds  = dto.getStoreIds()  != null ? dto.getStoreIds()  : parseIds(dto.getSelectedStores());
        List<Long> moduleIds = dto.getModuleIds() != null ? dto.getModuleIds() : parseIds(dto.getSelectedModules());

        Request request = new Request();
        applyRequestFields(request, dto, storeIds, moduleIds);
        applySelectionDetails(request, dto, storeIds, moduleIds);
        request.setLogoUrl(hasText(dto.getLogoUrl()) ? dto.getLogoUrl() : null);
        request.setContactImageUrl(hasText(dto.getContactImageUrl()) ? dto.getContactImageUrl() : null);

        Request saved = requestRepository.save(request);
        auditLogger.logAsync(requestAudit(saved, "join_request.created", AuditCategoryEnum.core, AuditStatusEnum.success, null));
        notificationService.createRequestCreatedNotification(saved);
        emailService.sendMarketplaceRequestConfirmationEmail(saved);
        return saved;
    }

    @Transactional
    public Request createMultipartRequest(
            String bankName, String bankEmail, MultipartFile logo,
            MultipartFile banniere, String banniereUrl,
            String country, String website,
            String contactName, String contactEmail, String contactPhone,
            MultipartFile contactImage,
            String description, String bankDescription, Integer establishmentYear,
            String selectedStores, String selectedModules,
            String marketplaceSlug, String marketplaceDescription,
            String primaryColor, String secondaryColor,
            Double totalAmount
    ) throws IOException {

        RequestDto dto = new RequestDto();
        dto.setBankName(bankName);
        dto.setBankEmail(bankEmail);
        dto.setCountry(country);
        dto.setWebsite(website);
        dto.setContactName(contactName);
        dto.setContactEmail(contactEmail);
        dto.setContactPhone(contactPhone);
        dto.setDescription(description);
        dto.setBankDescription(hasText(bankDescription) ? bankDescription : description);
        dto.setEstablishmentYear(establishmentYear);
        dto.setMarketplaceSlug(marketplaceSlug);
        dto.setMarketplaceDescription(marketplaceDescription);
        dto.setPrimaryColor(primaryColor);
        dto.setSecondaryColor(secondaryColor);
        dto.setBanniereUrl(banniereUrl);
        dto.setSelectedStores(selectedStores);
        dto.setSelectedModules(selectedModules);
        dto.setTotalAmount(totalAmount);
        dto.setSelectedStoreDetails(parseStoreSelectionDetails(selectedStores));

        List<Long> storeIds = dto.getSelectedStoreDetails() != null && !dto.getSelectedStoreDetails().isEmpty()
                ? dto.getSelectedStoreDetails().stream().map(RequestStoreSelectionDto::getStoreId).filter(Objects::nonNull).toList()
                : parseIds(selectedStores);
        List<Long> moduleIds = dto.getSelectedStoreDetails() != null && !dto.getSelectedStoreDetails().isEmpty()
                ? dto.getSelectedStoreDetails().stream()
                    .flatMap(store -> store.getModules() == null ? java.util.stream.Stream.<RequestModuleSelectionDto>empty() : store.getModules().stream())
                    .map(RequestModuleSelectionDto::getModuleId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList()
                : parseIds(selectedModules);

        Request request = new Request();
        applyRequestFields(request, dto, storeIds, moduleIds);
        applySelectionDetails(request, dto, storeIds, moduleIds);
        request.setLogoUrl(saveLogo(logo));
        request.setContactImageUrl(saveLogo(contactImage));
        String uploadedBanniereUrl = saveLogo(banniere);
        if (hasText(uploadedBanniereUrl)) {
            request.setBanniereUrl(uploadedBanniereUrl);
        }

        Request saved = requestRepository.save(request);
        auditLogger.logAsync(requestAudit(saved, "join_request.created", AuditCategoryEnum.core, AuditStatusEnum.success, null));
        notificationService.createRequestCreatedNotification(saved);
        emailService.sendMarketplaceRequestConfirmationEmail(saved);
        return saved;
    }

    @Transactional
    public Request approveRequest(Long id) {
        Request request = findOrThrow(id);
        if (request.getStatus() == RequestStatusEnum.rejected) {
            throw new IllegalStateException("Une demande rejetee ne peut pas etre approuvee.");
        }

        Bank bank = request.getRequestType() == RequestTypeEnum.subscription ? request.getBank() : provisionApprovedRequest(request);
        request.setStatus(RequestStatusEnum.approved);
        request.setBank(bank);
        Request saved = requestRepository.save(request);
        auditLogger.logAsync(requestAudit(saved, "join_request.approved", AuditCategoryEnum.billing, AuditStatusEnum.success, null));
        notificationService.createRequestApprovedNotification(saved);

        if (request.getRequestType() != RequestTypeEnum.subscription) {
            String paymentLink = paymentService.initiatePayment(saved);
            emailService.sendPaymentInstructions(saved, paymentLink);
        }
        return saved;
    }

    @Transactional
    public Request rejectRequest(Long id) {
        return rejectRequest(id, null);
    }

    @Transactional
    public Request rejectRequest(Long id, String rejectionReason) {
        Request request = findOrThrow(id);
        if (request.getStatus() == RequestStatusEnum.approved) {
            throw new IllegalStateException("Une demande approuvee ne peut pas etre rejetee.");
        }
        request.setStatus(RequestStatusEnum.rejected);
        request.setRejectionReason(normalizeRejectionReason(rejectionReason));
        Request saved = requestRepository.save(request);
        auditLogger.logAsync(requestAudit(saved, "join_request.rejected", AuditCategoryEnum.core, AuditStatusEnum.success,
                buildRejectionAuditDiff(saved.getRejectionReason())));

        notificationService.createRequestRejectedNotification(saved, saved.getRejectionReason());
        if (requiresBankNotification(saved)) {
            notificationService.createBankRequestRejectedNotification(saved, saved.getRejectionReason());
        }

        try {
            sendRejectionEmail(saved, saved.getRejectionReason());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de rejet pour la demande {} : {}", saved.getId(), e.getMessage(), e);
        }
        return saved;
    }

    public Request updateStatus(Long id, RequestStatusEnum status) {
        Request request = findOrThrow(id);
        RequestStatusEnum before = request.getStatus();

        if (status == RequestStatusEnum.approved && request.getRequestType() != RequestTypeEnum.subscription) {
            Bank bank = provisionApprovedRequest(request);
            request.setBank(bank);
        }

        request.setStatus(status);
        Request saved = requestRepository.save(request);
        auditLogger.logAsync(requestAudit(saved, "join_request.status_changed", AuditCategoryEnum.core, AuditStatusEnum.success,
                "{\"before\":{\"status\":\"" + before + "\"},\"after\":{\"status\":\"" + status + "\"}}"));
        if (status == RequestStatusEnum.approved) {
            notificationService.createRequestApprovedNotification(saved);
        } else if (status == RequestStatusEnum.rejected) {
            notificationService.createRequestRejectedNotification(saved, saved.getRejectionReason());
            if (requiresBankNotification(saved)) {
                notificationService.createBankRequestRejectedNotification(saved, saved.getRejectionReason());
            }
            try {
                sendRejectionEmail(saved, saved.getRejectionReason());
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email de rejet pour la demande {} : {}", saved.getId(), e.getMessage(), e);
            }
        }
        return saved;
    }

    public long countPendingRequests() {
        return requestRepository.countByStatus(RequestStatusEnum.pending);
    }

    @Transactional
    public Bank validatePaymentAndProvisionBank(Long requestId) {
        Request request = findOrThrow(requestId);
        log.info("Provisionnement de la banque '{}' en cours...", request.getBankName());

        Bank bank = provisionApprovedRequest(request);
        paymentService.markRequestPaymentPaid(requestId);
        log.info("Banque '{}' provisionnée avec succès.", bank.getName());
        return bank;
    }

    public byte[] getLogoFile(String filename) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(filename);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Fichier introuvable : " + filename);
        }
        return Files.readAllBytes(filePath);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    private void applyRequestFields(Request request, RequestDto dto,
                                    List<Long> storeIds, List<Long> moduleIds) {
        RequestTypeEnum requestType = resolveRequestType(dto);
        validateRequiredFields(dto, storeIds, requestType);
        if (requestType == RequestTypeEnum.join) {
            validateMarketplaceFields(dto);
        }
        request.setRequestType(requestType);
        request.setStatus(RequestStatusEnum.pending);
        request.setPriority(dto.getPriority() != null ? dto.getPriority() : "medium");
        request.setCreatedBy(hasText(dto.getCreatedBy()) ? dto.getCreatedBy() : "public_join_form");
        request.setBankName(dto.getBankName());
        request.setBankEmail(dto.getBankEmail());
        request.setCountry(dto.getCountry());
        request.setWebsite(dto.getWebsite());
        request.setContactName(dto.getContactName());
        request.setContactEmail(dto.getContactEmail());
        request.setContactPhone(dto.getContactPhone());
        request.setContactImageUrl(dto.getContactImageUrl());
        request.setDescription(dto.getDescription());
        request.setBankDescription(hasText(dto.getBankDescription()) ? dto.getBankDescription() : dto.getDescription());
        request.setEstablishmentYear(dto.getEstablishmentYear());
        request.setMarketplaceSlug(hasText(dto.getMarketplaceSlug()) ? dto.getMarketplaceSlug().trim() : null);
        request.setMarketplaceDescription(dto.getMarketplaceDescription());
        request.setPrimaryColor(hasText(dto.getPrimaryColor()) ? dto.getPrimaryColor().trim().toUpperCase() : "#0F172A");
        request.setSecondaryColor(hasText(dto.getSecondaryColor()) ? dto.getSecondaryColor().trim().toUpperCase() : "#F97316");
        request.setBanniereUrl(dto.getBanniereUrl());
        attachExistingBankIfNeeded(request, dto, requestType);
        request.setSelectedStores(toJsonArray(storeIds));
        request.setSelectedModules(toJsonArray(moduleIds));
        request.setTotalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : dto.getTotalMonthlyPrice());
        request.setStores(resolveStores(storeIds));
        request.setModules(resolveModules(moduleIds));
    }

    private RequestTypeEnum resolveRequestType(RequestDto dto) {
        if (dto.getRequestType() != null) {
            return dto.getRequestType();
        }
        return dto.getBankId() != null ? RequestTypeEnum.store : RequestTypeEnum.join;
    }

    private void applySelectionDetails(Request request, RequestDto dto, List<Long> storeIds, List<Long> moduleIds) {
        request.getSelectedStoreDetails().clear();

        List<RequestStoreSelectionDto> details = dto.getSelectedStoreDetails();
        if (details == null || details.isEmpty()) {
            details = buildSelectionDetailsFromIds(storeIds, moduleIds);
        }

        for (RequestStoreSelectionDto storeDto : details) {
            RequestStoreSelection storeSelection = new RequestStoreSelection();
            storeSelection.setRequest(request);
            storeSelection.setStoreId(storeDto.getStoreId());
            storeSelection.setStoreName(storeDto.getStoreName());
            storeSelection.setStoreDescription(storeDto.getStoreDescription());
            storeSelection.setStorePrice(nonNegativePrice(storeDto.getStorePrice(), "Le prix du store doit etre superieur ou egal a 0."));

            if (storeDto.getModules() != null) {
                for (RequestModuleSelectionDto moduleDto : storeDto.getModules()) {
                    RequestModuleSelection moduleSelection = new RequestModuleSelection();
                    moduleSelection.setRequestStore(storeSelection);
                    moduleSelection.setModuleId(moduleDto.getModuleId());
                    moduleSelection.setModuleName(moduleDto.getModuleName());
                    moduleSelection.setModuleDescription(moduleDto.getModuleDescription());
                    moduleSelection.setModulePrice(nonNegativePrice(moduleDto.getModulePrice(), "Le prix du module doit etre superieur ou egal a 0."));
                    moduleSelection.setParameters(moduleDto.getParameters());
                    storeSelection.getModules().add(moduleSelection);
                }
            }

            request.getSelectedStoreDetails().add(storeSelection);
        }
    }

    private Bank provisionApprovedRequest(Request request) {
        Bank bank = resolveOrCreateBank(request);
        request.setBank(bank);
        Marketplace marketplace = createMarketplace(bank, request);
        createAdminUser(bank, request);
        assignStoresAndModules(marketplace, request);
        return bank;
    }

    private void attachExistingBankIfNeeded(Request request, RequestDto dto, RequestTypeEnum requestType) {
        if (requestType != RequestTypeEnum.store && requestType != RequestTypeEnum.subscription) {
            return;
        }

        Long bankId = dto.getBankId();
        if (bankId == null) {
            throw new IllegalArgumentException("La banque existante est obligatoire pour cette demande.");
        }

        Bank bank = bankRepository.findById(bankId)
                .orElseThrow(() -> new IllegalArgumentException("La banque selectionnee est introuvable."));
        request.setBank(bank);
    }

    private Bank resolveOrCreateBank(Request request) {
        if (request.getBank() != null && request.getBank().getId() != null) {
            return request.getBank();
        }

        String slug = hasText(request.getMarketplaceSlug()) ? request.getMarketplaceSlug() : toSlug(request.getBankName());
        return bankRepository.findBySlug(slug)
                .orElseGet(() -> {
                    Bank bank = new Bank();
                    bank.setName(request.getBankName());
                    bank.setSlug(slug);
                    bank.setLogoUrl(request.getLogoUrl());
                    bank.setCountry(request.getCountry());
                    bank.setWebsiteUrl(request.getWebsite());
                    bank.setEmail(request.getBankEmail());
                    bank.setDescription(hasText(request.getBankDescription())
                            ? request.getBankDescription()
                            : "Marketplace de la banque " + request.getBankName());
                    bank.setEstablishedYear(request.getEstablishmentYear());
                    bank.setStatus(BankStatusEnum.active);
                    bank.setTotalUsers(1);
                    return bankRepository.save(bank);
                });
    }

    private Marketplace createMarketplace(Bank bank, Request request) {
        Marketplace marketplace = bank.getId() != null
                ? marketplaceRepository.findByBankId(bank.getId()).orElseGet(Marketplace::new)
                : new Marketplace();

        marketplace.setBank(bank);
        marketplace.setPrimaryColor(hasText(request.getPrimaryColor()) ? request.getPrimaryColor() : "#0F172A");
        marketplace.setSecondaryColor(hasText(request.getSecondaryColor()) ? request.getSecondaryColor() : "#F97316");
        marketplace.setHomepageTitle("Bienvenue sur la marketplace de " + bank.getName());
        marketplace.setWelcomeText("Decouvrez nos produits de financement en quelques clics.");
        if (hasText(request.getBanniereUrl())) {
            marketplace.setBanniereUrl(request.getBanniereUrl());
        }
        marketplace.setLogoImageUrl(bank.getLogoUrl());
        marketplace.setFooterText("(c) 2026 " + bank.getName() + ". Tous droits reserves.");
        if (request.getTotalAmount() != null) {
            marketplace.setTotalMonthlyPrice(BigDecimal.valueOf(request.getTotalAmount()));
        }
        if (marketplace.getStatus() == null) {
            marketplace.setStatus(MarketplaceStatusEnum.active);
        }
        return marketplaceRepository.save(marketplace);
    }

    private void validateMarketplaceFields(RequestDto dto) {
        String marketplaceSlug = dto.getMarketplaceSlug() != null ? dto.getMarketplaceSlug().trim() : "";
        String marketplaceDescription = dto.getMarketplaceDescription();
        String primaryColor = dto.getPrimaryColor() != null ? dto.getPrimaryColor().trim() : "";
        String secondaryColor = dto.getSecondaryColor() != null ? dto.getSecondaryColor().trim() : "";

        if (!hasText(marketplaceSlug)) {
            throw new IllegalArgumentException("Le slug marketplace est obligatoire.");
        }
        if (!MARKETPLACE_SLUG_PATTERN.matcher(marketplaceSlug).matches()) {
            throw new IllegalArgumentException("Le slug marketplace doit contenir uniquement des minuscules, chiffres et tirets.");
        }
        if (requestRepository.existsByMarketplaceSlug(marketplaceSlug) || bankRepository.existsBySlug(marketplaceSlug)) {
            throw new IllegalArgumentException("Le slug marketplace est deja utilise.");
        }
        if (marketplaceDescription != null && marketplaceDescription.length() > 500) {
            throw new IllegalArgumentException("La description marketplace ne doit pas depasser 500 caracteres.");
        }
        if (!HEX_COLOR_PATTERN.matcher(primaryColor).matches()) {
            throw new IllegalArgumentException("La couleur primaire doit etre une couleur hex valide comme #FF6600.");
        }
        if (!HEX_COLOR_PATTERN.matcher(secondaryColor).matches()) {
            throw new IllegalArgumentException("La couleur secondaire doit etre une couleur hex valide comme #FF6600.");
        }
    }

    private void validateRequiredFields(RequestDto dto, List<Long> storeIds, RequestTypeEnum requestType) {
        if (!hasText(dto.getBankName())) {
            throw new IllegalArgumentException("Le nom de la banque est obligatoire.");
        }
        if (!isEmail(dto.getBankEmail())) {
            throw new IllegalArgumentException("L'email de la banque est obligatoire et doit etre valide.");
        }
        if (!hasText(dto.getContactName())) {
            throw new IllegalArgumentException("Le nom du contact est obligatoire.");
        }
        if (!isEmail(dto.getContactEmail())) {
            throw new IllegalArgumentException("L'email du contact est obligatoire et doit etre valide.");
        }
        if (requestType != RequestTypeEnum.subscription && (storeIds == null || storeIds.isEmpty())) {
            throw new IllegalArgumentException("Au moins un store doit etre selectionne.");
        }
        Double total = dto.getTotalAmount() != null ? dto.getTotalAmount() : dto.getTotalMonthlyPrice();
        if (total == null || total < 0) {
            throw new IllegalArgumentException("Le total mensuel doit etre superieur ou egal a 0.");
        }
        Integer establishmentYear = dto.getEstablishmentYear();
        int currentYear = Year.now().getValue();
        if (establishmentYear != null && (establishmentYear < 1800 || establishmentYear > currentYear)) {
            throw new IllegalArgumentException("L'annee d'etablissement doit etre entre 1800 et " + currentYear + ".");
        }
    }

    private List<RequestStoreSelectionDto> parseStoreSelectionDetails(String raw) {
        if (!hasText(raw) || !raw.trim().startsWith("[")) {
            return List.of();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<List<RequestStoreSelectionDto>>() {});
        } catch (IOException e) {
            log.warn("Impossible de parser les details stores/modules, fallback IDs: {}", e.getMessage());
            return List.of();
        }
    }

    private List<RequestStoreSelectionDto> buildSelectionDetailsFromIds(List<Long> storeIds, List<Long> moduleIds) {
        List<Module> modules = resolveModules(moduleIds);
        return resolveStores(storeIds).stream()
                .map(store -> {
                    RequestStoreSelectionDto storeDto = new RequestStoreSelectionDto();
                    storeDto.setStoreId(store.getId());
                    storeDto.setStoreName(store.getName());
                    storeDto.setStoreDescription(store.getDescription());
                    storeDto.setStorePrice(store.getPrice());
                    storeDto.setModules(modules.stream().map(module -> {
                        RequestModuleSelectionDto moduleDto = new RequestModuleSelectionDto();
                        moduleDto.setModuleId(module.getId());
                        moduleDto.setModuleName(hasText(module.getName()) ? module.getName() : module.getCategory());
                        moduleDto.setModuleDescription(module.getDescription());
                        moduleDto.setModulePrice(module.getPrice());
                        return moduleDto;
                    }).collect(Collectors.toList()));
                    return storeDto;
                })
                .collect(Collectors.toList());
    }

    private BigDecimal nonNegativePrice(BigDecimal price, String message) {
        if (price == null) return BigDecimal.ZERO;
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(message);
        }
        return price;
    }

    private boolean isEmail(String value) {
        return hasText(value) && EMAIL_PATTERN.matcher(value.trim()).matches();
    }

    private AuditLogRequest requestAudit(Request request, String action, AuditCategoryEnum category, AuditStatusEnum status, String diff) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setActorId(request.getContactEmail());
        audit.setActorName(request.getContactName());
        audit.setActorRole("bank_contact");
        audit.setAction(action);
        audit.setCategory(category);
        audit.setResourceType("join_request");
        audit.setResourceId(request.getId() != null ? String.valueOf(request.getId()) : null);
        audit.setStatus(status);
        audit.setDiff(diff);
        audit.setMetadata("{\"bankName\":\"" + safeJson(request.getBankName()) + "\",\"marketplaceSlug\":\"" + safeJson(request.getMarketplaceSlug()) + "\"}");
        return audit;
    }

    private String safeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void createAdminUser(Bank bank, Request request) {
        String email = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            log.info("Utilisateur admin banque existant trouve pour '{}', mise a jour du rattachement banque.", email);
            user.setBank(bank);
            user.setFullName(hasText(user.getFullName()) ? user.getFullName() : request.getContactName());
            user.setPhone(hasText(user.getPhone()) ? user.getPhone() : request.getContactPhone());
            if (hasText(request.getContactImageUrl())) {
                user.setContactImageUrl(request.getContactImageUrl());
            }
            user.setRole(RoleEnum.ADMIN_BANK);
            user.setStatus(UserStatusEnum.active);
            if (!hasText(user.getPassword())) {
                user.setPassword(generateTemporaryPassword()); // TODO: encoder avec BCrypt
            }
            userRepository.save(user);
            return;
        }

        log.info("Creation utilisateur admin banque pour '{}'.", email);
        User admin = new User();
        admin.setBank(bank);
        admin.setFullName(request.getContactName());
        admin.setEmail(email);
        admin.setPhone(request.getContactPhone());
        admin.setContactImageUrl(request.getContactImageUrl());
        admin.setRole(RoleEnum.ADMIN_BANK);
        admin.setStatus(UserStatusEnum.active);
        admin.setPassword(generateTemporaryPassword()); // TODO: encoder avec BCrypt
        userRepository.save(admin);
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder();
        for (int index = 0; index < 12; index++) {
            password.append(PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    private void assignStoresAndModules(Marketplace marketplace, Request request) {
        List<Long> storeIds  = parseIds(request.getSelectedStores());
        List<Long> moduleIds = parseIds(request.getSelectedModules());
        Map<Long, List<Long>> selectedModulesByStore = resolveSelectedModulesByStore(request);
        boolean hasStoreSpecificSelections = !selectedModulesByStore.isEmpty();

        for (Long storeId : storeIds) {
            storeRepository.findById(storeId).ifPresent(store -> {
                MarketplaceStore savedMarketplaceStore = marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(marketplace.getId(), store.getId())
                        .orElseGet(() -> {
                            MarketplaceStore marketplaceStore = new MarketplaceStore();
                            marketplaceStore.setMarketplace(marketplace);
                            marketplaceStore.setStore(store);
                            marketplaceStore.setEnabled(true);
                            marketplaceStore.setVisible(true);
                            return marketplaceStoreRepository.save(marketplaceStore);
                        });

                List<Long> moduleIdsForStore = hasStoreSpecificSelections
                        ? selectedModulesByStore.getOrDefault(storeId, List.of())
                        : moduleIds;

                for (Long moduleId : moduleIdsForStore) {
                    moduleRepository.findById(moduleId).ifPresent(module -> {
                        marketplaceStoreModuleRepository.findByMarketplaceStore_IdAndModule_Id(savedMarketplaceStore.getId(), module.getId())
                                .orElseGet(() -> {
                                    MarketplaceStoreModule bsm = new MarketplaceStoreModule();
                                    bsm.setMarketplaceStore(savedMarketplaceStore);
                                    bsm.setModule(module);
                                    bsm.setEnabled(true);
                                    bsm.setVisible(true);
                                    return marketplaceStoreModuleRepository.save(bsm);
                                });
                    });
                }
            });
        }
    }

    private boolean requiresBankNotification(Request request) {
        if (request == null || request.getRequestType() == null) {
            return false;
        }
        return request.getRequestType() == RequestTypeEnum.store
                || request.getRequestType() == RequestTypeEnum.module
                || request.getRequestType() == RequestTypeEnum.subscription;
    }

    private void sendRejectionEmail(Request request, String rejectionReason) {
        if (request == null || request.getRequestType() == null) {
            emailService.sendRequestRejectedEmail(request);
            return;
        }

        RequestTypeEnum requestType = request.getRequestType();
        if (requestType == RequestTypeEnum.join) {
            emailService.sendJoinRequestRejectedEmail(request, rejectionReason);
            return;
        }
        if (requestType == RequestTypeEnum.store) {
            emailService.sendStoreRequestRejectedEmail(request, rejectionReason);
            return;
        }
        if (requestType == RequestTypeEnum.module) {
            emailService.sendModuleRequestRejectedEmail(request, rejectionReason);
            return;
        }
        if (requestType == RequestTypeEnum.subscription) {
            emailService.sendSubscriptionRequestRejectedEmail(request, rejectionReason);
            return;
        }

        emailService.sendRequestRejectedEmail(request);
    }

    private String buildRejectionAuditDiff(String rejectionReason) {
        String normalizedReason = normalizeRejectionReason(rejectionReason);
        if (!hasText(normalizedReason)) {
            return null;
        }
        return "{\"after\":{\"rejectionReason\":\"" + safeJson(normalizedReason) + "\"}}";
    }

    private String normalizeRejectionReason(String rejectionReason) {
        return hasText(rejectionReason) ? rejectionReason.trim() : null;
    }

    private Map<Long, List<Long>> resolveSelectedModulesByStore(Request request) {
        if (request == null || request.getSelectedStoreDetails() == null || request.getSelectedStoreDetails().isEmpty()) {
            return Map.of();
        }

        return request.getSelectedStoreDetails().stream()
                .filter((storeSelection) -> storeSelection != null && storeSelection.getStoreId() != null)
                .collect(Collectors.toMap(
                        RequestStoreSelection::getStoreId,
                        storeSelection -> storeSelection.getModules() == null
                                ? List.of()
                                : storeSelection.getModules().stream()
                                .map(RequestModuleSelection::getModuleId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList(),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private String saveLogo(MultipartFile logo) throws IOException {
        if (logo == null || logo.isEmpty()) return null;

        String original  = logo.getOriginalFilename();
        String extension = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")) : "";
        String filename  = UUID.randomUUID() + extension;

        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        Files.copy(logo.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/logos/" + filename;
    }

    private List<Long> parseIds(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();

        List<Long> ids = new ArrayList<>();
        String[] parts = raw.replace("[", "").replace("]", "").split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    ids.add(Long.parseLong(trimmed));
                } catch (NumberFormatException e) {
                    log.warn("ID invalide ignoré : '{}'", trimmed);
                }
            }
        }
        return ids;
    }

    private String toJsonArray(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return "[]";
        return "[" + ids.stream().map(String::valueOf).collect(Collectors.joining(",")) + "]";
    }

    private List<Store> resolveStores(List<Long> ids) {
        return ids.stream()
                .map(storeRepository::findById)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
    }

    private List<Module> resolveModules(List<Long> ids) {
        return ids.stream()
                .map(moduleRepository::findById)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
    }

    private Request findOrThrow(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Demande non trouvee : " + id));
    }

    private void initializeRequestSelections(Request request) {
        Hibernate.initialize(request.getSelectedStoreDetails());
        request.getSelectedStoreDetails().forEach(store -> Hibernate.initialize(store.getModules()));
    }

    private String toSlug(String value) {
        if (value == null) return "";
        return value.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
