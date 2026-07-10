package org.matchia.matchiabackend.ai.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.ai.dto.AiAskRequest;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.NotificationRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PlatformContextService {

    private static final int MAX_ITEMS = 5;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRANCE);

    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final RequestRepository requestRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public String buildContext(AiAskRequest request, AiIntentService.IntentType intentType) {
        StringBuilder context = new StringBuilder();
        context.append("Contexte plateforme Matchia (lecture seule).\n");
        context.append("Page courante: ").append(safeText(request != null ? request.getCurrentPage() : null, "/")).append("\n");
        context.append("Intent détecté: ").append(intentType.name()).append("\n");

        Long bankId = request != null ? request.getBankId() : null;
        Long marketplaceId = request != null ? request.getMarketplaceId() : null;
        Long storeId = request != null ? request.getStoreId() : null;

        context.append("\nRésumé global:\n");
        context.append("- Banques enregistrées: ").append(bankRepository.count()).append("\n");
        context.append("- Marketplaces enregistrées: ").append(marketplaceRepository.count()).append("\n");
        context.append("- Stores actifs: ").append(storeRepository.findByStatus(org.matchia.matchiabackend.entity.enums.StoreStatusEnum.active).size()).append("\n");
        context.append("- Modules actifs: ").append(moduleRepository.findByStatus(ModuleStatusEnum.active).size()).append("\n");
        context.append("- Demandes en attente: ").append(requestRepository.countByStatus(RequestStatusEnum.pending)).append("\n");
        context.append("- Paiements réglés: ").append(paymentRepository.countByStatus(PaymentStatusEnum.paid)).append("\n");
        context.append("- Notifications non lues: ").append(notificationRepository.countByRecipientIdIsNullAndStatus(NotificationStatusEnum.UNREAD)).append("\n");

        appendRelevantSection(context, intentType, bankId, marketplaceId, storeId);
        return context.toString();
    }

    private void appendRelevantSection(
            StringBuilder context,
            AiIntentService.IntentType intentType,
            Long bankId,
            Long marketplaceId,
            Long storeId
    ) {
        switch (intentType) {
            case BANKS -> appendBanksSection(context, bankId);
            case STORES -> appendStoresSection(context, bankId, marketplaceId, storeId);
            case MODULES -> appendModulesSection(context, bankId, marketplaceId, storeId);
            case SUBSCRIPTIONS -> appendSubscriptionsSection(context, bankId, marketplaceId);
            case PAYMENTS -> appendPaymentsSection(context, bankId, marketplaceId);
            case REQUESTS -> appendRequestsSection(context, bankId);
            case NOTIFICATIONS -> appendNotificationsSection(context);
            case MODULE_VISIBILITY -> appendModuleVisibilitySection(context, bankId, marketplaceId, storeId);
            case GENERAL -> {
                appendBanksSection(context, bankId);
                appendStoresSection(context, bankId, marketplaceId, storeId);
                appendModulesSection(context, bankId, marketplaceId, storeId);
                appendSubscriptionsSection(context, bankId, marketplaceId);
                appendPaymentsSection(context, bankId, marketplaceId);
                appendRequestsSection(context, bankId);
                appendNotificationsSection(context);
            }
        }
    }

    private void appendBanksSection(StringBuilder context, Long bankId) {
        context.append("\nBanques:\n");
        if (bankId != null) {
            bankRepository.findById(bankId).ifPresentOrElse(
                    bank -> context.append(formatBank(bank)).append("\n"),
                    () -> context.append("- Banque introuvable pour l'identifiant ").append(bankId).append("\n")
            );
            return;
        }

        List<Bank> banks = bankRepository.findAll().stream()
                .sorted(Comparator.comparing(Bank::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(MAX_ITEMS)
                .toList();
        if (banks.isEmpty()) {
            context.append("- Aucune banque enregistrée.\n");
            return;
        }
        banks.forEach(bank -> context.append(formatBank(bank)).append("\n"));
    }

    private void appendStoresSection(StringBuilder context, Long bankId, Long marketplaceId, Long storeId) {
        context.append("\nStores:\n");
        List<MarketplaceStore> marketplaceStores = loadMarketplaceStores(bankId, marketplaceId, storeId);
        if (marketplaceStores.isEmpty()) {
            context.append("- Aucun store trouvé dans le contexte demandé.\n");
            return;
        }
        marketplaceStores.stream()
                .filter(ms -> ms.getStore() != null)
                .limit(MAX_ITEMS)
                .forEach(ms -> context.append(formatMarketplaceStore(ms)).append("\n"));
    }

    private void appendModulesSection(StringBuilder context, Long bankId, Long marketplaceId, Long storeId) {
        context.append("\nModules:\n");
        List<MarketplaceStore> marketplaceStores = loadMarketplaceStores(bankId, marketplaceId, storeId);
        if (marketplaceStores.isEmpty()) {
            context.append("- Aucun module trouvé dans le contexte demandé.\n");
            return;
        }

        marketplaceStores.stream()
                .filter(ms -> ms.getStore() != null)
                .filter(ms -> storeId == null || (ms.getStore().getId() != null && ms.getStore().getId().equals(storeId)))
                .limit(MAX_ITEMS)
                .forEach(ms -> {
                    context.append("- Store ").append(safeText(ms.getStore().getName(), "Store")).append(":\n");
                    appendModulesOfMarketplaceStore(context, ms);
                });
    }

    private void appendModuleVisibilitySection(StringBuilder context, Long bankId, Long marketplaceId, Long storeId) {
        context.append("\nVisibilité des modules:\n");
        Optional<MarketplaceStore> marketplaceStore = findMarketplaceStore(bankId, marketplaceId, storeId);
        if (marketplaceStore.isEmpty()) {
            context.append("- Aucune association store/marketplace trouvée pour analyser la visibilité.\n");
            return;
        }

        MarketplaceStore store = marketplaceStore.get();
        context.append("- Store: ").append(store.getStore() != null ? safeText(store.getStore().getName(), "Store") : "-").append("\n");
        context.append("  - Activé: ").append(Boolean.TRUE.equals(store.getEnabled()) ? "oui" : "non").append("\n");
        context.append("  - Visible: ").append(Boolean.TRUE.equals(store.getVisible()) ? "oui" : "non").append("\n");
        if (store.getMarketplace() != null && store.getMarketplace().getBank() != null) {
            context.append("  - Banque: ").append(safeText(store.getMarketplace().getBank().getName(), "-")).append("\n");
        }
        appendModulesOfMarketplaceStore(context, store);
        context.append("Conseil: si le module n'apparait pas, vérifier son statut global, son état enabled/visible pour le store et l'association marketplace_store_module.\n");
    }

    private void appendSubscriptionsSection(StringBuilder context, Long bankId, Long marketplaceId) {
        context.append("\nAbonnements récents:\n");
        List<Payment> paidPayments = loadPaidPayments(bankId, marketplaceId);
        if (paidPayments.isEmpty()) {
            context.append("- Aucun abonnement réglé trouvé.\n");
            return;
        }
        paidPayments.stream()
                .limit(MAX_ITEMS)
                .forEach(payment -> context.append(formatPayment(payment)).append("\n"));
    }

    private void appendPaymentsSection(StringBuilder context, Long bankId, Long marketplaceId) {
        context.append("\nPaiements récents:\n");
        List<Payment> payments = loadPaidPayments(bankId, marketplaceId);
        if (payments.isEmpty()) {
            context.append("- Aucun paiement récent trouvé.\n");
            return;
        }
        payments.stream()
                .limit(MAX_ITEMS)
                .forEach(payment -> context.append(formatPayment(payment)).append("\n"));
    }

    private void appendRequestsSection(StringBuilder context, Long bankId) {
        context.append("\nDemandes:\n");
        List<Request> requests = bankId != null
                ? requestRepository.findByBank_IdOrderByCreatedAtDesc(bankId)
                : requestRepository.findByStatusOrderByCreatedAtDesc(RequestStatusEnum.pending);

        if (requests.isEmpty()) {
            context.append("- Aucune demande trouvée.\n");
            return;
        }

        requests.stream()
                .limit(MAX_ITEMS)
                .forEach(request -> context.append(formatRequest(request)).append("\n"));
    }

    private void appendNotificationsSection(StringBuilder context) {
        context.append("\nNotifications récentes:\n");
        List<Notification> notifications = notificationRepository.findTop10ByOrderByCreatedAtDesc();
        if (notifications.isEmpty()) {
            context.append("- Aucune notification trouvée.\n");
            return;
        }

        notifications.stream()
                .sorted(Comparator.comparing(Notification::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(MAX_ITEMS)
                .forEach(notification -> context.append(formatNotification(notification)).append("\n"));
    }

    private List<MarketplaceStore> loadMarketplaceStores(Long bankId, Long marketplaceId, Long storeId) {
        if (storeId != null) {
            return marketplaceStoreRepository.findByStore_Id(storeId);
        }
        if (marketplaceId != null) {
            return marketplaceStoreRepository.findByMarketplace_Id(marketplaceId);
        }
        if (bankId != null) {
            return marketplaceRepository.findByBankId(bankId)
                    .map(marketplace -> marketplaceStoreRepository.findByMarketplace_Id(marketplace.getId()))
                    .orElse(List.of());
        }
        return marketplaceStoreRepository.findAll();
    }

    private List<Payment> loadPaidPayments(Long bankId, Long marketplaceId) {
        return paymentRepository.findTop10ByStatusOrderByPaidAtDesc(PaymentStatusEnum.paid).stream()
                .filter(payment -> payment != null && payment.getRequest() != null)
                .filter(payment -> {
                    Request request = payment.getRequest();
                    if (bankId != null && request.getBank() != null && request.getBank().getId() != null) {
                        return bankId.equals(request.getBank().getId());
                    }
                    if (marketplaceId != null && request.getBank() != null && request.getBank().getMarketplace() != null) {
                        return marketplaceId.equals(request.getBank().getMarketplace().getId());
                    }
                    return true;
                })
                .limit(MAX_ITEMS)
                .toList();
    }

    private Optional<MarketplaceStore> findMarketplaceStore(Long bankId, Long marketplaceId, Long storeId) {
        if (storeId != null) {
            if (bankId != null) {
                return marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(bankId, storeId);
            }
            if (marketplaceId != null) {
                return marketplaceStoreRepository.findByMarketplace_Id(marketplaceId).stream()
                        .filter(ms -> ms.getStore() != null && storeId.equals(ms.getStore().getId()))
                        .findFirst();
            }
            return marketplaceStoreRepository.findByStore_Id(storeId).stream().findFirst();
        }
        return loadMarketplaceStores(bankId, marketplaceId, null).stream().findFirst();
    }

    private void appendModulesOfMarketplaceStore(StringBuilder context, MarketplaceStore marketplaceStore) {
        List<MarketplaceStoreModule> modules = marketplaceStore.getMarketplaceStoreModules();
        if (modules == null || modules.isEmpty()) {
            context.append("  - Aucun module associé.\n");
            return;
        }

        modules.stream()
                .filter(moduleLink -> moduleLink != null && moduleLink.getModule() != null)
                .limit(MAX_ITEMS)
                .forEach(moduleLink -> {
                    Module module = moduleLink.getModule();
                    context.append("  - ")
                            .append(safeText(module.getName(), "Module"))
                            .append(" | statut=")
                            .append(module.getStatus() != null ? module.getStatus().name() : "-")
                            .append(" | enabled=")
                            .append(Boolean.TRUE.equals(moduleLink.getEnabled()) ? "oui" : "non")
                            .append(" | visible=")
                            .append(Boolean.TRUE.equals(moduleLink.getVisible()) ? "oui" : "non")
                            .append(" | prix=")
                            .append(module.getPrice() != null ? module.getPrice() : BigDecimal.ZERO)
                            .append("\n");
                });
    }

    private String formatBank(Bank bank) {
        Marketplace marketplace = bank != null ? bank.getMarketplace() : null;
        int storeCount = marketplace != null && marketplace.getMarketplaceStores() != null
                ? marketplace.getMarketplaceStores().size()
                : 0;
        return "- " + safeText(bank.getName(), "Banque")
                + " | slug=" + safeText(bank.getSlug(), "-")
                + " | statut=" + (bank.getStatus() != null ? bank.getStatus().name() : "-")
                + " | stores=" + storeCount;
    }

    private String formatMarketplaceStore(MarketplaceStore marketplaceStore) {
        Store store = marketplaceStore.getStore();
        return "- " + safeText(store != null ? store.getName() : null, "Store")
                + " | enabled=" + Boolean.TRUE.equals(marketplaceStore.getEnabled())
                + " | visible=" + Boolean.TRUE.equals(marketplaceStore.getVisible())
                + " | modules=" + (marketplaceStore.getMarketplaceStoreModules() != null ? marketplaceStore.getMarketplaceStoreModules().size() : 0);
    }

    private String formatPayment(Payment payment) {
        Request request = payment.getRequest();
        return "- Paiement #" + payment.getId()
                + " | banque=" + safeText(payment.getBankName(), request != null && request.getBankName() != null ? request.getBankName() : "La banque")
                + " | montant=" + payment.getAmount()
                + " | devise=" + safeText(payment.getCurrency(), "-")
                + " | payé le=" + formatDate(payment.getPaidAt());
    }

    private String formatRequest(Request request) {
        return "- Demande #" + request.getId()
                + " | type=" + (request.getRequestType() != null ? request.getRequestType().name() : "-")
                + " | statut=" + (request.getStatus() != null ? request.getStatus().name() : "-")
                + " | banque=" + safeText(request.getBankName(), "-")
                + " | marketplace=" + safeText(request.getMarketplaceSlug(), "-")
                + " | total=" + (request.getTotalAmount() != null ? request.getTotalAmount() : 0);
    }

    private String formatNotification(Notification notification) {
        return "- Notification #" + notification.getId()
                + " | type=" + (notification.getType() != null ? notification.getType().name() : "-")
                + " | statut=" + (notification.getStatus() != null ? notification.getStatus().name() : "-")
                + " | titre=" + safeText(notification.getTitle(), "-")
                + " | message=" + truncate(safeText(notification.getMessage(), "-"), 180);
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String formatDate(java.time.LocalDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.format(DATE_FORMATTER);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "-";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 3) + "...";
    }
}
