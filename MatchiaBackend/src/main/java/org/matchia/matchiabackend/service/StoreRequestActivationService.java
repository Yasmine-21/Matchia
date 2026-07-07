package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.RequestStoreSelection;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreRequestActivationService {

    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;

    @Transactional
    public Bank activateAfterPayment(Request request, Payment payment) {
        if (request == null || request.getRequestType() != RequestTypeEnum.store) {
            return resolveBank(request);
        }

        Bank bank = resolveBank(request);
        if (bank == null || bank.getId() == null) {
            log.warn("Impossible d'activer la demande store {}: banque introuvable.", request.getId());
            return null;
        }

        Marketplace marketplace = marketplaceRepository.findByBankId(bank.getId()).orElse(null);
        if (marketplace == null || marketplace.getId() == null) {
            log.warn("Impossible d'activer la demande store {}: marketplace introuvable pour la banque {}.", request.getId(), bank.getId());
            return bank;
        }

        List<RequestStoreSelection> selections = resolveSelections(request);
        if (selections.isEmpty()) {
            log.warn("Aucune selection de store trouvee pour la demande store {}.", request.getId());
            return bank;
        }

        boolean createdNewStoreAssignment = false;

        for (RequestStoreSelection storeSelection : selections) {
            if (storeSelection == null || storeSelection.getStoreId() == null) {
                continue;
            }

            Store store = storeRepository.findById(storeSelection.getStoreId()).orElse(null);
            if (store == null) {
                continue;
            }

            MarketplaceStore marketplaceStore = marketplaceStoreRepository
                    .findByMarketplace_IdAndStore_Id(marketplace.getId(), store.getId())
                    .orElseGet(() -> {
                        MarketplaceStore assignment = new MarketplaceStore();
                        assignment.setMarketplace(marketplace);
                        assignment.setStore(store);
                        assignment.setEnabled(true);
                        assignment.setVisible(true);
                        return assignment;
                    });

            if (marketplaceStore.getId() == null) {
                createdNewStoreAssignment = true;
            }

            if (marketplaceStore.getEnabled() == null || !marketplaceStore.getEnabled()) {
                marketplaceStore.setEnabled(true);
            }
            if (marketplaceStore.getVisible() == null || !marketplaceStore.getVisible()) {
                marketplaceStore.setVisible(true);
            }
            MarketplaceStore persistedMarketplaceStore = marketplaceStoreRepository.save(marketplaceStore);

            for (RequestModuleSelection moduleSelection : safeModules(storeSelection)) {
                if (moduleSelection == null || moduleSelection.getModuleId() == null) {
                    continue;
                }
                Module module = moduleRepository.findById(moduleSelection.getModuleId()).orElse(null);
                if (module == null) {
                    continue;
                }
                marketplaceStoreModuleRepository
                        .findByMarketplaceStore_IdAndModule_Id(persistedMarketplaceStore.getId(), module.getId())
                        .orElseGet(() -> {
                            MarketplaceStoreModule assignment = new MarketplaceStoreModule();
                            assignment.setMarketplaceStore(persistedMarketplaceStore);
                            assignment.setModule(module);
                            assignment.setEnabled(true);
                            assignment.setVisible(true);
                            return marketplaceStoreModuleRepository.save(assignment);
                        });
            }
        }

        if (createdNewStoreAssignment) {
            updateMarketplaceAmount(marketplace, payment, request);
        }

        return bank;
    }

    private void updateMarketplaceAmount(Marketplace marketplace, Payment payment, Request request) {
        BigDecimal amountToAdd = resolveAmount(request, payment);
        if (amountToAdd == null || amountToAdd.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal current = marketplace.getTotalMonthlyPrice() != null
                ? marketplace.getTotalMonthlyPrice()
                : BigDecimal.ZERO;
        marketplace.setTotalMonthlyPrice(current.add(amountToAdd).setScale(2, RoundingMode.HALF_UP));
        marketplaceRepository.save(marketplace);
    }

    private BigDecimal resolveAmount(Request request, Payment payment) {
        if (payment != null && payment.getAmount() != null) {
            return payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        }
        if (request != null && request.getTotalAmount() != null) {
            return BigDecimal.valueOf(request.getTotalAmount()).setScale(2, RoundingMode.HALF_UP);
        }
        return null;
    }

    private List<RequestStoreSelection> resolveSelections(Request request) {
        if (request == null) {
            return List.of();
        }
        if (request.getSelectedStoreDetails() != null && !request.getSelectedStoreDetails().isEmpty()) {
            return request.getSelectedStoreDetails();
        }

        List<Long> storeIds = parseIds(request.getSelectedStores());
        if (storeIds.isEmpty()) {
            return List.of();
        }

        List<Long> moduleIds = parseIds(request.getSelectedModules());
        List<RequestStoreSelection> selections = new ArrayList<>();
        for (Long storeId : storeIds) {
            RequestStoreSelection selection = new RequestStoreSelection();
            selection.setStoreId(storeId);
            if (!moduleIds.isEmpty()) {
                List<RequestModuleSelection> moduleSelections = new ArrayList<>();
                for (Long moduleId : moduleIds) {
                    RequestModuleSelection moduleSelection = new RequestModuleSelection();
                    moduleSelection.setModuleId(moduleId);
                    moduleSelections.add(moduleSelection);
                }
                selection.setModules(moduleSelections);
            }
            selections.add(selection);
        }
        return selections;
    }

    private List<RequestModuleSelection> safeModules(RequestStoreSelection storeSelection) {
        return storeSelection != null && storeSelection.getModules() != null ? storeSelection.getModules() : List.of();
    }

    private List<Long> parseIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String normalized = raw.replace("[", "").replace("]", "");
        if (normalized.isBlank()) {
            return List.of();
        }
        return Arrays.stream(normalized.split(","))
                .map(String::trim)
                .filter(value -> value != null && !value.isBlank())
                .map(value -> {
                    try {
                        return Long.parseLong(value);
                    } catch (NumberFormatException e) {
                        log.warn("ID invalide ignore dans la demande store: '{}'", value);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Bank resolveBank(Request request) {
        if (request == null) {
            return null;
        }
        if (request.getBank() != null && request.getBank().getId() != null) {
            return request.getBank();
        }
        if (request.getMarketplaceSlug() != null && !request.getMarketplaceSlug().isBlank()) {
            return bankRepository.findBySlug(request.getMarketplaceSlug().trim().toLowerCase(Locale.ROOT)).orElse(null);
        }
        if (request.getBankName() != null && !request.getBankName().isBlank()) {
            String slug = toSlug(request.getBankName());
            if (!slug.isBlank()) {
                return bankRepository.findBySlug(slug).orElse(null);
            }
        }
        return null;
    }

    private String toSlug(String value) {
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}
