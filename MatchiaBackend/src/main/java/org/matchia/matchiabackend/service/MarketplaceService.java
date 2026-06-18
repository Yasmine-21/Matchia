package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.MarketplaceConfigDto;
import org.matchia.matchiabackend.dto.MarketplaceBrandingDto;
import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.mapper.MarketplaceMapper;
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
import java.text.Normalizer;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MarketplaceService {

    private static final String DEFAULT_PRIMARY_COLOR = "#2563eb";
    private static final String DEFAULT_SECONDARY_COLOR = "#f97316";

    private final MarketplaceRepository marketplaceRepository;
    private final BankRepository bankRepository;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    private final MarketplaceMapper marketplaceMapper;

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    public MarketplaceService(
            MarketplaceRepository marketplaceRepository,
            BankRepository bankRepository,
            StoreRepository storeRepository,
            ModuleRepository moduleRepository,
            MarketplaceStoreRepository marketplaceStoreRepository,
            MarketplaceStoreModuleRepository marketplaceStoreModuleRepository,
            MarketplaceMapper marketplaceMapper
    ) {
        this.marketplaceRepository = marketplaceRepository;
        this.bankRepository = bankRepository;
        this.storeRepository = storeRepository;
        this.moduleRepository = moduleRepository;
        this.marketplaceStoreRepository = marketplaceStoreRepository;
        this.marketplaceStoreModuleRepository = marketplaceStoreModuleRepository;
        this.marketplaceMapper = marketplaceMapper;
    }

    /**
     * Create or update a Marketplace.
     */
    public Marketplace save(Marketplace marketplace) {
        return marketplaceRepository.save(marketplace);
    }

    public String saveBanniere(MultipartFile banniere) throws IOException {
        if (banniere == null || banniere.isEmpty()) {
            throw new IllegalArgumentException("La banniere est obligatoire.");
        }

        String original = banniere.getOriginalFilename();
        String extension = original != null && original.contains(".")
                ? original.substring(original.lastIndexOf("."))
                : "";
        String filename = UUID.randomUUID() + extension;

        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        Files.copy(banniere.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/logos/" + filename;
    }

    public String saveLogo(MultipartFile logo) throws IOException {
        if (logo == null || logo.isEmpty()) {
            throw new IllegalArgumentException("Le logo est obligatoire.");
        }

        String original = logo.getOriginalFilename();
        String extension = original != null && original.contains(".")
                ? original.substring(original.lastIndexOf("."))
                : "";
        String filename = UUID.randomUUID() + extension;

        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        Files.copy(logo.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/logos/" + filename;
    }

    /**
     * Get all Marketplaces.
     */
    @Transactional(readOnly = true)
    public List<Marketplace> findAll() {
        List<Marketplace> marketplaces = marketplaceRepository.findAll();
        marketplaces.forEach(this::initializeMarketplaceDetails);
        return marketplaces;
    }

    /**
     * Find a Marketplace by its ID.
     */
    @Transactional(readOnly = true)
    public Optional<Marketplace> findById(Long id) {
        Optional<Marketplace> marketplace = marketplaceRepository.findById(id);
        marketplace.ifPresent(this::initializeMarketplaceDetails);
        return marketplace;
    }

    @Transactional(readOnly = true)
    public Optional<Marketplace> findBySlug(String slug) {
        if (!hasText(slug)) {
            return Optional.empty();
        }
        Optional<Marketplace> marketplace = marketplaceRepository.findByBank_Slug(slug.trim().toLowerCase());
        marketplace.ifPresent(this::initializeMarketplaceDetails);
        return marketplace;
    }

    @Transactional(readOnly = true)
    public Optional<MarketplaceDto.MarketplaceStoreDetailDto> findPublicStoreByIdentifier(String marketplaceSlug, String storeIdentifier) {
        if (!hasText(marketplaceSlug) || !hasText(storeIdentifier)) {
            return Optional.empty();
        }

        Optional<Marketplace> marketplace = marketplaceRepository.findByBank_Slug(marketplaceSlug.trim().toLowerCase());
        if (marketplace.isEmpty() || marketplace.get().getId() == null) {
            return Optional.empty();
        }

        Long marketplaceId = marketplace.get().getId();
        Map<Long, List<MarketplaceDto.MarketplaceModuleDetailDto>> requestedModulesByStore =
                marketplaceMapper.resolveRequestedModulesByStore(marketplaceSlug);
        return marketplaceStoreRepository.findByMarketplace_Id(marketplaceId).stream()
                .filter(this::isActiveStoreAssignment)
                .filter((marketplaceStore) -> matchesStoreIdentifier(marketplaceStore, storeIdentifier))
                .findFirst()
                .map((marketplaceStore) -> marketplaceMapper.toPublicStoreDetailDto(
                        marketplaceStore,
                        requestedModulesByStore.get(marketplaceStore.getStore().getId())
                ));
    }

    private void initializeMarketplaceDetails(Marketplace marketplace) {
        if (marketplace.getId() == null) {
            return;
        }

        marketplace.setMarketplaceStores(marketplaceStoreRepository.findByMarketplace_Id(marketplace.getId()));
        if (marketplace.getMarketplaceStores() == null) {
            return;
        }
        marketplace.getMarketplaceStores().forEach((marketplaceStore) -> {
            if (marketplaceStore.getStore() != null) {
                marketplaceStore.getStore().getName();
            }
            if (marketplaceStore.getMarketplaceStoreModules() != null) {
                marketplaceStore.getMarketplaceStoreModules().forEach((marketplaceStoreModule) -> {
                    if (marketplaceStoreModule.getModule() != null) {
                        marketplaceStoreModule.getModule().getName();
                    }
                });
            }
        });
    }

    private MarketplaceDto.MarketplaceStoreDetailDto toPublicStoreDetailDto(MarketplaceStore marketplaceStore) {
        if (marketplaceStore == null) {
            return null;
        }

        List<MarketplaceDto.MarketplaceModuleDetailDto> modules = marketplaceStore.getMarketplaceStoreModules() == null
                ? List.of()
                : marketplaceStore.getMarketplaceStoreModules().stream()
                .filter(this::isActiveModuleAssignment)
                .map(this::toPublicModuleDetailDto)
                .filter(java.util.Objects::nonNull)
                .toList();

        return new MarketplaceDto.MarketplaceStoreDetailDto(
                marketplaceStore.getId(),
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getName() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getDescription() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getBanniereUrl() : null,
                marketplaceStore.getStore() != null ? marketplaceStore.getStore().getPrice() : null,
                marketplaceStore.getEnabled(),
                marketplaceStore.getVisible(),
                modules
        );
    }

    private MarketplaceDto.MarketplaceModuleDetailDto toPublicModuleDetailDto(MarketplaceStoreModule marketplaceStoreModule) {
        if (marketplaceStoreModule == null || marketplaceStoreModule.getModule() == null) {
            return null;
        }

        Module module = marketplaceStoreModule.getModule();
        return new MarketplaceDto.MarketplaceModuleDetailDto(
                marketplaceStoreModule.getId(),
                module.getId(),
                module.getName(),
                module.getCategory(),
                module.getPrice(),
                marketplaceStoreModule.getEnabled(),
                marketplaceStoreModule.getVisible()
        );
    }

    private boolean matchesStoreIdentifier(MarketplaceStore marketplaceStore, String storeIdentifier) {
        if (marketplaceStore == null || !hasText(storeIdentifier)) {
            return false;
        }

        String normalizedIdentifier = normalizeSlug(storeIdentifier);
        if (marketplaceStore.getStore() == null) {
            return false;
        }

        Long storeId = marketplaceStore.getStore().getId();
        if (storeId != null && storeIdentifier.trim().equals(String.valueOf(storeId))) {
            return true;
        }

        String storeName = marketplaceStore.getStore().getName();
        if (!hasText(storeName)) {
            return false;
        }
        return normalizeSlug(storeName).equals(normalizedIdentifier);
    }

    private boolean isActiveStoreAssignment(MarketplaceStore marketplaceStore) {
        return marketplaceStore != null
                && Boolean.TRUE.equals(marketplaceStore.getEnabled())
                && Boolean.TRUE.equals(marketplaceStore.getVisible())
                && marketplaceStore.getStore() != null;
    }

    private boolean isActiveModuleAssignment(MarketplaceStoreModule marketplaceStoreModule) {
        return marketplaceStoreModule != null
                && Boolean.TRUE.equals(marketplaceStoreModule.getEnabled())
                && Boolean.TRUE.equals(marketplaceStoreModule.getVisible())
                && marketplaceStoreModule.getModule() != null
                && marketplaceStoreModule.getModule().getStatus() == ModuleStatusEnum.active;
    }

    private String normalizeSlug(String value) {
        if (!hasText(value)) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        return normalized.replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    @Transactional
    public Marketplace configureMarketplace(MarketplaceConfigDto dto) {
        validateMarketplaceConfig(dto);

        Bank bank = bankRepository.findById(dto.getBankId())
                .orElseThrow(() -> new NoSuchElementException("Banque non trouvee : " + dto.getBankId()));

        String slug = dto.getMarketplaceSlug().trim();
        bankRepository.findBySlug(slug)
                .filter(existingBank -> !existingBank.getId().equals(bank.getId()))
                .ifPresent(existingBank -> {
                    throw new IllegalArgumentException("Ce slug marketplace est deja utilise.");
                });

        bank.setSlug(slug);
        bank.setDescription(dto.getMarketplaceDescription());
        Bank savedBank = bankRepository.save(bank);

        Marketplace marketplace = marketplaceRepository.findByBankId(savedBank.getId())
                .orElseGet(Marketplace::new);
        marketplace.setBank(savedBank);
        marketplace.setPrimaryColor(resolveText(dto.getPrimaryColor(), marketplace.getPrimaryColor(), DEFAULT_PRIMARY_COLOR));
        marketplace.setSecondaryColor(resolveText(dto.getSecondaryColor(), marketplace.getSecondaryColor(), DEFAULT_SECONDARY_COLOR));
        marketplace.setHomepageTitle(resolveText(
                dto.getHomepageTitle(),
                marketplace.getHomepageTitle(),
                "Bienvenue sur la marketplace de " + savedBank.getName()
        ));
        marketplace.setWelcomeText(resolveText(
                dto.getWelcomeText(),
                marketplace.getWelcomeText(),
                hasText(dto.getMarketplaceDescription())
                        ? dto.getMarketplaceDescription()
                        : "Decouvrez nos produits de financement en quelques clics."
        ));
        if (hasText(dto.getBanniereUrl()) || hasText(dto.getBannerImageUrl())) {
            marketplace.setBanniereUrl(resolveBanniereUrl(dto.getBanniereUrl(), dto.getBannerImageUrl()));
        } else if (marketplace.getBanniereUrl() == null) {
            marketplace.setBanniereUrl(null);
        }
        marketplace.setLogoImageUrl(resolveText(
                dto.getLogoImageUrl(),
                marketplace.getLogoImageUrl(),
                savedBank.getLogoUrl()
        ));
        marketplace.setFooterText(resolveText(
                dto.getFooterText(),
                marketplace.getFooterText(),
                "(c) 2026 " + savedBank.getName() + ". Tous droits reserves."
        ));
        marketplace.setTotalMonthlyPrice(dto.getTotalMonthlyPrice());
        if (marketplace.getStatus() == null) {
            marketplace.setStatus(MarketplaceStatusEnum.active);
        }
        Marketplace savedMarketplace = marketplaceRepository.save(marketplace);

        assignStoresAndModules(savedMarketplace, dto.getStoreIds(), dto.getModuleIds(), dto.getSelectedModulesByStore());

        return savedMarketplace;
    }

    @Transactional
    public Marketplace updateMarketplace(Long id, MarketplaceConfigDto dto) {
        Marketplace existingMarketplace = marketplaceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Marketplace non trouvee : " + id));
        if (dto == null) {
            throw new IllegalArgumentException("Les donnees marketplace sont obligatoires.");
        }
        dto.setBankId(existingMarketplace.getBank() != null ? existingMarketplace.getBank().getId() : dto.getBankId());
        Marketplace savedMarketplace = configureMarketplace(dto);
        initializeMarketplaceDetails(savedMarketplace);
        return savedMarketplace;
    }

    @Transactional
    public Marketplace updateMarketplaceBranding(Long id, MarketplaceBrandingDto dto) {
        Marketplace marketplace = marketplaceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Marketplace non trouvee : " + id));

        Bank bank = marketplace.getBank();
        if (bank == null) {
            throw new IllegalArgumentException("La marketplace ne reference aucune banque.");
        }

        if (dto == null) {
            throw new IllegalArgumentException("Les donnees branding sont obligatoires.");
        }

        marketplace.setPrimaryColor(resolveText(dto.getPrimaryColor(), marketplace.getPrimaryColor(), DEFAULT_PRIMARY_COLOR));
        marketplace.setSecondaryColor(resolveText(dto.getSecondaryColor(), marketplace.getSecondaryColor(), DEFAULT_SECONDARY_COLOR));
        marketplace.setHomepageTitle(resolveText(
                dto.getHomepageTitle(),
                marketplace.getHomepageTitle(),
                "Bienvenue sur la marketplace de " + bank.getName()
        ));
        marketplace.setWelcomeText(resolveText(
                dto.getWelcomeText(),
                marketplace.getWelcomeText(),
                bank.getDescription() != null ? bank.getDescription() : "Decouvrez nos solutions de financement."
        ));
        marketplace.setFooterText(resolveText(
                dto.getFooterText(),
                marketplace.getFooterText(),
                "(c) 2026 " + bank.getName() + ". Tous droits reserves."
        ));
        marketplace.setLogoImageUrl(resolveText(
                dto.getLogoImageUrl(),
                marketplace.getLogoImageUrl(),
                bank.getLogoUrl()
        ));
        if (hasText(dto.getBanniereUrl()) || hasText(dto.getBannerImageUrl())) {
            marketplace.setBanniereUrl(resolveBanniereUrl(dto.getBanniereUrl(), dto.getBannerImageUrl()));
        }

        Marketplace savedMarketplace = marketplaceRepository.save(marketplace);
        initializeMarketplaceDetails(savedMarketplace);
        return savedMarketplace;
    }

    @Transactional
    public Marketplace updateStatus(Long id, MarketplaceStatusEnum status) {
        if (status == null) {
            throw new IllegalArgumentException("Le statut marketplace est obligatoire.");
        }

        Marketplace marketplace = marketplaceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Marketplace non trouvee : " + id));
        marketplace.setStatus(status);
        Marketplace savedMarketplace = marketplaceRepository.save(marketplace);
        initializeMarketplaceDetails(savedMarketplace);
        return savedMarketplace;
    }

    /**
     * Delete a Marketplace by its ID.
     */
    @Transactional
    public void deleteById(Long id) {
        if (!marketplaceRepository.existsById(id)) {
            throw new NoSuchElementException("Marketplace non trouvee : " + id);
        }
        marketplaceRepository.deleteById(id);
    }

    private void validateMarketplaceConfig(MarketplaceConfigDto dto) {
        if (dto == null || dto.getBankId() == null) {
            throw new IllegalArgumentException("La banque est obligatoire.");
        }
        if (!hasText(dto.getMarketplaceSlug())) {
            throw new IllegalArgumentException("Le slug marketplace est obligatoire.");
        }
        if (!dto.getMarketplaceSlug().trim().matches("^[a-z0-9-]+$")) {
            throw new IllegalArgumentException("Le slug marketplace doit contenir uniquement des minuscules, chiffres et tirets.");
        }
        if (dto.getMarketplaceDescription() != null && dto.getMarketplaceDescription().length() > 500) {
            throw new IllegalArgumentException("La description marketplace ne doit pas depasser 500 caracteres.");
        }
        if (!hasText(dto.getPrimaryColor())) {
            throw new IllegalArgumentException("La couleur primaire est obligatoire.");
        }
        if (!hasText(dto.getSecondaryColor())) {
            throw new IllegalArgumentException("La couleur secondaire est obligatoire.");
        }
        if (dto.getStoreIds() == null || dto.getStoreIds().isEmpty()) {
            throw new IllegalArgumentException("Selectionnez au moins un store.");
        }
        if ((dto.getModuleIds() == null || dto.getModuleIds().isEmpty())
                && (dto.getSelectedModulesByStore() == null || dto.getSelectedModulesByStore().values().stream().allMatch(List::isEmpty))) {
            throw new IllegalArgumentException("Selectionnez au moins un module.");
        }
    }

    private void assignStoresAndModules(
            Marketplace marketplace,
            List<Long> storeIds,
            List<Long> moduleIds,
            Map<Long, List<Long>> selectedModulesByStore
    ) {
        removeUnselectedAssignments(marketplace, storeIds, moduleIds, selectedModulesByStore);

        for (Long storeId : storeIds) {
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new NoSuchElementException("Store non trouve : " + storeId));

            MarketplaceStore marketplaceStore = marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(marketplace.getId(), store.getId())
                    .orElseGet(() -> {
                        MarketplaceStore newMarketplaceStore = new MarketplaceStore();
                        newMarketplaceStore.setMarketplace(marketplace);
                        newMarketplaceStore.setStore(store);
                        newMarketplaceStore.setEnabled(true);
                        newMarketplaceStore.setVisible(true);
                        return marketplaceStoreRepository.save(newMarketplaceStore);
                    });

            if (marketplaceStore.getEnabled() == null || !marketplaceStore.getEnabled() || marketplaceStore.getVisible() == null || !marketplaceStore.getVisible()) {
                marketplaceStore.setEnabled(true);
                marketplaceStore.setVisible(true);
                marketplaceStore = marketplaceStoreRepository.save(marketplaceStore);
            }

            List<Long> moduleIdsForStore = selectedModulesByStore != null
                    ? selectedModulesByStore.getOrDefault(storeId, List.of())
                    : moduleIds;

            if (moduleIdsForStore == null) {
                moduleIdsForStore = List.of();
            }

            for (Long moduleId : moduleIdsForStore) {
                Module module = moduleRepository.findById(moduleId)
                        .orElseThrow(() -> new NoSuchElementException("Module non trouve : " + moduleId));

                MarketplaceStore currentMarketplaceStore = marketplaceStore;
                Optional<MarketplaceStoreModule> existingModuleAssignment = marketplaceStoreModuleRepository
                        .findByMarketplaceStore_IdAndModule_Id(currentMarketplaceStore.getId(), module.getId());

                if (existingModuleAssignment.isPresent()) {
                    MarketplaceStoreModule marketplaceStoreModule = existingModuleAssignment.get();
                    if (marketplaceStoreModule.getEnabled() == null || !marketplaceStoreModule.getEnabled()
                            || marketplaceStoreModule.getVisible() == null || !marketplaceStoreModule.getVisible()) {
                        marketplaceStoreModule.setEnabled(true);
                        marketplaceStoreModule.setVisible(true);
                        marketplaceStoreModuleRepository.save(marketplaceStoreModule);
                    }
                } else {
                    marketplaceStoreModuleRepository.save(newMarketplaceStoreModule(currentMarketplaceStore, module));
                }
            }
        }
    }

    private void removeUnselectedAssignments(
            Marketplace marketplace,
            List<Long> storeIds,
            List<Long> moduleIds,
            Map<Long, List<Long>> selectedModulesByStore
    ) {
        Set<Long> selectedStoreIds = storeIds != null ? Set.copyOf(storeIds) : Set.of();
        List<MarketplaceStore> existingStores = marketplaceStoreRepository.findByMarketplace_Id(marketplace.getId());

        for (MarketplaceStore marketplaceStore : existingStores) {
            Long storeId = marketplaceStore.getStore() != null ? marketplaceStore.getStore().getId() : null;
            if (storeId == null || !selectedStoreIds.contains(storeId)) {
                marketplaceStoreRepository.delete(marketplaceStore);
                continue;
            }

            Set<Long> selectedModuleIds = resolveSelectedModuleIdsForStore(storeId, moduleIds, selectedModulesByStore);
            List<MarketplaceStoreModule> modulesToDelete = marketplaceStore.getMarketplaceStoreModules().stream()
                    .filter((marketplaceStoreModule) -> marketplaceStoreModule.getModule() == null
                            || !selectedModuleIds.contains(marketplaceStoreModule.getModule().getId()))
                    .collect(Collectors.toList());
            modulesToDelete.forEach(marketplaceStoreModuleRepository::delete);
        }
    }

    private Set<Long> resolveSelectedModuleIdsForStore(
            Long storeId,
            List<Long> moduleIds,
            Map<Long, List<Long>> selectedModulesByStore
    ) {
        List<Long> selectedForStore = selectedModulesByStore != null && selectedModulesByStore.containsKey(storeId)
                ? selectedModulesByStore.get(storeId)
                : moduleIds;
        return selectedForStore != null ? Set.copyOf(selectedForStore) : Set.of();
    }

    private MarketplaceStoreModule newMarketplaceStoreModule(MarketplaceStore marketplaceStore, Module module) {
        MarketplaceStoreModule marketplaceStoreModule = new MarketplaceStoreModule();
        marketplaceStoreModule.setMarketplaceStore(marketplaceStore);
        marketplaceStoreModule.setModule(module);
        marketplaceStoreModule.setEnabled(true);
        marketplaceStoreModule.setVisible(true);
        return marketplaceStoreModule;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String resolveBanniereUrl(String banniereUrl, String bannerImageUrl) {
        if (hasText(banniereUrl)) {
            return banniereUrl.trim();
        }
        return hasText(bannerImageUrl) ? bannerImageUrl.trim() : null;
    }

    private String resolveText(String candidate, String currentValue, String fallback) {
        if (hasText(candidate)) {
            return candidate.trim();
        }
        if (hasText(currentValue)) {
            return currentValue.trim();
        }
        return fallback;
    }
}
