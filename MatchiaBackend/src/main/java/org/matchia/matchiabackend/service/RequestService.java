package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestService {

    private static final String UPLOAD_DIR = "uploads/logos/";
    private static final String DEFAULT_LOGO_URL = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop";

    private final RequestRepository requestRepository;
    private final EmailService emailService;
    private final PaymentService paymentService;
    private final BankRepository bankRepository;
    private final BankBrandingRepository bankBrandingRepository;
    private final BankSettingRepository bankSettingRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;
    private final BankStoreRepository bankStoreRepository;
    private final BankStoreModuleRepository bankStoreModuleRepository;

    // ─── Appelées depuis le contrôleur ───────────────────────────────────────

    public List<Request> findAll() {
        return requestRepository.findAll();
    }

    public Optional<Request> findById(Long id) {
        return requestRepository.findById(id);
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
        request.setLogoUrl(hasText(dto.getLogoUrl()) ? dto.getLogoUrl() : DEFAULT_LOGO_URL);

        return requestRepository.save(request);
    }

    @Transactional
    public Request createMultipartRequest(
            String bankName, String bankEmail, MultipartFile logo,
            String country, String website,
            String contactName, String contactEmail, String contactPhone,
            String description, String selectedStores, String selectedModules,
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
        dto.setSelectedStores(selectedStores);
        dto.setSelectedModules(selectedModules);
        dto.setTotalAmount(totalAmount);

        List<Long> storeIds  = parseIds(selectedStores);
        List<Long> moduleIds = parseIds(selectedModules);

        Request request = new Request();
        applyRequestFields(request, dto, storeIds, moduleIds);
        request.setLogoUrl(saveLogo(logo));

        return requestRepository.save(request);
    }

    public Request approveRequest(Long id) {
        Request request = findOrThrow(id);
        request.setStatus(RequestStatusEnum.approved);
        Request saved = requestRepository.save(request);

        String paymentLink = paymentService.initiatePayment(saved);
        emailService.sendPaymentInstructions(saved, paymentLink);
        return saved;
    }

    public Request rejectRequest(Long id) {
        Request request = findOrThrow(id);
        request.setStatus(RequestStatusEnum.rejected);
        return requestRepository.save(request);
    }

    @Transactional
    public Bank validatePaymentAndProvisionBank(Long requestId) {
        Request request = findOrThrow(requestId);
        log.info("Provisionnement de la banque '{}' en cours...", request.getBankName());

        Bank bank = createBank(request);
        createBranding(bank);
        createSettings(bank, request);
        createAdminUser(bank, request);
        assignStoresAndModules(bank, request);

        log.info("Banque '{}' provisionnée avec succès.", bank.getName());
        return bank;
    }

    public byte[] getLogoFile(String filename) throws IOException {
        Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Fichier introuvable : " + filename);
        }
        return Files.readAllBytes(filePath);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    private void applyRequestFields(Request request, RequestDto dto,
                                    List<Long> storeIds, List<Long> moduleIds) {
        request.setRequestType(dto.getRequestType() != null ? dto.getRequestType() : RequestTypeEnum.join);
        request.setStatus(RequestStatusEnum.pending);
        request.setPriority(dto.getPriority() != null ? dto.getPriority() : "medium");
        request.setCreatedBy(dto.getCreatedBy());
        request.setBankName(dto.getBankName());
        request.setBankEmail(dto.getBankEmail());
        request.setCountry(dto.getCountry());
        request.setWebsite(dto.getWebsite());
        request.setContactName(dto.getContactName());
        request.setContactEmail(dto.getContactEmail());
        request.setContactPhone(dto.getContactPhone());
        request.setDescription(dto.getDescription());
        request.setSelectedStores(toJsonArray(storeIds));
        request.setSelectedModules(toJsonArray(moduleIds));
        request.setTotalAmount(dto.getTotalAmount());
        request.setStores(resolveStores(storeIds));
        request.setModules(resolveModules(moduleIds));
    }

    private Bank createBank(Request request) {
        Bank bank = new Bank();
        bank.setName(request.getBankName());
        bank.setSlug(toSlug(request.getBankName()));
        bank.setLogoUrl(request.getLogoUrl());
        bank.setCountry(request.getCountry());
        bank.setWebsiteUrl(request.getWebsite());
        bank.setDescription("Marketplace de la banque " + request.getBankName());
        bank.setStatus(BankStatusEnum.active);
        bank.setTotalUsers(1);
        return bankRepository.save(bank);
    }

    private void createBranding(Bank bank) {
        BankBranding b = new BankBranding();
        b.setBank(bank);
        b.setPrimaryColor("#0f172a");
        b.setSecondaryColor("#f97316");
        b.setHomepageTitle("Bienvenue sur la marketplace de " + bank.getName());
        b.setWelcomeText("Découvrez nos produits de financement en quelques clics.");
        b.setLogoImageUrl(bank.getLogoUrl());
        b.setFooterText("© 2026 " + bank.getName() + ". Tous droits réservés.");
        bankBrandingRepository.save(b);
    }

    private void createSettings(Bank bank, Request request) {
        BankSetting s = new BankSetting();
        s.setBank(bank);
        s.setSupportEmail(request.getContactEmail());
        s.setSupportPhone(request.getContactPhone());
        bankSettingRepository.save(s);
    }

    private void createAdminUser(Bank bank, Request request) {
        User admin = new User();
        admin.setBank(bank);
        admin.setFullName(request.getContactName());
        admin.setEmail(request.getContactEmail());
        admin.setPhone(request.getContactPhone());
        admin.setRole(RoleEnum.ADMIN);
        admin.setStatus(UserStatusEnum.active);
        admin.setPassword("123456"); // TODO: encoder avec BCrypt
        userRepository.save(admin);
    }

    private void assignStoresAndModules(Bank bank, Request request) {
        List<Long> storeIds  = parseIds(request.getSelectedStores());
        List<Long> moduleIds = parseIds(request.getSelectedModules());

        for (Long storeId : storeIds) {
            storeRepository.findById(storeId).ifPresent(store -> {
                BankStore bankStore = new BankStore();
                bankStore.setBank(bank);
                bankStore.setStore(store);
                bankStore.setEnabled(true);
                bankStore.setVisible(true);
                BankStore savedBankStore = bankStoreRepository.save(bankStore);

                for (Long moduleId : moduleIds) {
                    moduleRepository.findById(moduleId).ifPresent(module -> {
                        BankStoreModule bsm = new BankStoreModule();
                        bsm.setBankStore(savedBankStore);
                        bsm.setModule(module);
                        bsm.setEnabled(true);
                        bsm.setVisible(true);
                        bankStoreModuleRepository.save(bsm);
                    });
                }
            });
        }
    }

    private String saveLogo(MultipartFile logo) throws IOException {
        if (logo == null || logo.isEmpty()) return DEFAULT_LOGO_URL;

        String original  = logo.getOriginalFilename();
        String extension = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")) : "";
        String filename  = UUID.randomUUID() + extension;

        Path dir = Paths.get(UPLOAD_DIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        Files.copy(logo.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/api/requests/logos/" + filename;
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
                .orElseThrow(() -> new RuntimeException("Demande non trouvée : " + id));
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