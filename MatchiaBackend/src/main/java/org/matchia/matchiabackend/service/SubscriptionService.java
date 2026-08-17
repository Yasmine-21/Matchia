package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.PaidSubscriptionDto;
import org.matchia.matchiabackend.dto.SubscriptionDto;
import org.matchia.matchiabackend.dto.SubscriptionExpiryAlertDto;
import org.matchia.matchiabackend.dto.SubscriptionOverviewDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.RequestStoreSelection;
import org.matchia.matchiabackend.entity.Subscription;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentTypeEnum;
import org.matchia.matchiabackend.entity.enums.SubscriptionStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private static final int DEFAULT_DURATION_MONTHS = 12;
    private static final int SUBSCRIPTION_DURATION_YEARS = 1;

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final RequestRepository requestRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final AuditLogger auditLogger;
    private final NotificationService notificationService;

    @Transactional
    public Subscription resolveOrCreateForRequest(Request request) {
        if (request == null || request.getId() == null) {
            throw new IllegalArgumentException("Une demande existante est requise pour creer un abonnement.");
        }

        return subscriptionRepository.findByRequest_Id(request.getId())
                .orElseGet(() -> {
                    Marketplace marketplace = resolveMarketplace(request);
                    Subscription subscription = new Subscription();
                    subscription.setRequest(request);
                    subscription.setMarketplace(marketplace);
                    subscription.setStatus(SubscriptionStatusEnum.PENDING_PAYMENT);
                    subscription.setDurationMonths(DEFAULT_DURATION_MONTHS);
                    return subscriptionRepository.save(subscription);
                });
    }

    @Transactional
    public Subscription resolveOrCreateForPayment(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Le paiement est obligatoire.");
        }
        if (payment.getSubscription() != null) {
            return payment.getSubscription();
        }
        Subscription subscription = resolveOrCreateForRequest(payment.getRequest());
        payment.setSubscription(subscription);
        return subscription;
    }

    @Transactional
    public Subscription activateFromSuccessfulPayment(Payment payment) {
        if (payment == null || payment.getStatus() != PaymentStatusEnum.paid || payment.getPaidAt() == null) {
            throw new IllegalArgumentException("Seul un paiement confirme peut activer un abonnement.");
        }

        Subscription subscription = resolveOrCreateForPayment(payment);
        LocalDate paidDate = payment.getPaidAt().toLocalDate();
        LocalDate periodStartDate = payment.getPaymentType() == PaymentTypeEnum.RENEWAL
                && subscription.getExpirationDate() != null
                && subscription.getExpirationDate().isAfter(paidDate)
                ? subscription.getExpirationDate()
                : paidDate;
        if (payment.getPaymentType() != PaymentTypeEnum.RENEWAL || subscription.getStartDate() == null) {
            subscription.setStartDate(paidDate);
        }
        ensureAnnualDuration(subscription);
        subscription.setExpirationDate(periodStartDate.plusYears(SUBSCRIPTION_DURATION_YEARS));
        subscription.setStatus(SubscriptionStatusEnum.ACTIVE);
        Subscription saved = subscriptionRepository.save(subscription);
        updateMarketplaceStatus(saved.getMarketplace());
        audit(saved, "subscription.activated");
        return saved;
    }

    @Transactional
    public Subscription markRenewalPending(Subscription subscription) {
        if (subscription == null || subscription.getId() == null) {
            throw new IllegalArgumentException("L'abonnement est obligatoire.");
        }
        // A valid subscription must remain usable until its actual expiration date.
        if (subscription.getExpirationDate() == null || subscription.getExpirationDate().isBefore(LocalDate.now())) {
            subscription.setStatus(SubscriptionStatusEnum.PENDING_RENEWAL);
        }
        Subscription saved = subscriptionRepository.save(subscription);
        audit(saved, "subscription.renewal_requested");
        return saved;
    }

    @Transactional
    public Request createRenewalRequest(Long subscriptionId, Long bankId, String createdBy) {
        Subscription subscription = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Abonnement introuvable : " + subscriptionId));
        Request original = subscription.getRequest();
        if (original == null || original.getBank() == null || original.getBank().getMarketplace() == null) {
            throw new IllegalStateException("L'abonnement ne possede pas de demande d'origine complete.");
        }
        if (bankId == null || !bankId.equals(original.getBank().getId())) {
            throw new IllegalArgumentException("Cet abonnement n'appartient pas a la banque courante.");
        }
        if (requestRepository.existsBySubscription_IdAndRequestTypeAndStatus(
                subscriptionId, org.matchia.matchiabackend.entity.enums.RequestTypeEnum.renewal,
                org.matchia.matchiabackend.entity.enums.RequestStatusEnum.pending)) {
            throw new IllegalStateException("Une demande de renouvellement est deja en attente.");
        }

        Request renewal = new Request();
        renewal.setOriginalRequest(original);
        renewal.setSubscription(subscription);
        renewal.setBank(original.getBank());
        renewal.setRequestType(org.matchia.matchiabackend.entity.enums.RequestTypeEnum.renewal);
        renewal.setStatus(org.matchia.matchiabackend.entity.enums.RequestStatusEnum.pending);
        renewal.setPriority("high");
        renewal.setCreatedBy(createdBy);
        renewal.setBankName(original.getBankName());
        renewal.setBankEmail(original.getBankEmail());
        renewal.setBankPhone(original.getBankPhone());
        renewal.setLogoUrl(original.getLogoUrl());
        renewal.setCountry(original.getCountry());
        renewal.setWebsite(original.getWebsite());
        renewal.setContactName(original.getContactName());
        renewal.setContactEmail(original.getContactEmail());
        renewal.setContactPhone(original.getContactPhone());
        renewal.setDescription("Demande de renouvellement de l'abonnement marketplace.");
        renewal.setBankDescription(original.getBankDescription());
        renewal.setEstablishmentYear(original.getEstablishmentYear());
        renewal.setMarketplaceSlug(original.getMarketplaceSlug());
        renewal.setMarketplaceDescription(original.getMarketplaceDescription());
        renewal.setPrimaryColor(original.getPrimaryColor());
        renewal.setSecondaryColor(original.getSecondaryColor());
        renewal.setBanniereUrl(original.getBanniereUrl());
        renewal.setSelectedStores(original.getSelectedStores());
        renewal.setSelectedModules(original.getSelectedModules());
        renewal.setTotalAmount(resolveRenewalAmount(subscription, original));
        renewal.setStores(new java.util.ArrayList<>(original.getStores()));
        renewal.setModules(new java.util.ArrayList<>(original.getModules()));
        copyStoreSelections(original, renewal);

        Request saved = requestRepository.save(renewal);
        notificationService.createRequestCreatedNotification(saved);
        auditRenewalRequest(saved, "subscription.renewal_request.submitted");
        return saved;
    }

    @Transactional
    public void synchronizeExpirationStatuses() {
        LocalDate today = LocalDate.now();
        List<Subscription> subscriptions = subscriptionRepository.findAll();
        for (Subscription subscription : subscriptions) {
            if (subscription.getStatus() == SubscriptionStatusEnum.ACTIVE
                    && subscription.getExpirationDate() != null
                    && subscription.getExpirationDate().isBefore(today)) {
                subscription.setStatus(SubscriptionStatusEnum.EXPIRED);
                subscriptionRepository.save(subscription);
                audit(subscription, "subscription.expired");
            }
        }
        subscriptions.stream()
                .map(Subscription::getMarketplace)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Marketplace::getId, marketplace -> marketplace, (left, right) -> left))
                .values()
                .forEach(this::updateMarketplaceStatus);
    }

    @Transactional
    public SubscriptionOverviewDto getOverview() {
        synchronizeExpirationStatuses();
        LocalDate today = LocalDate.now();
        List<SubscriptionDto> subscriptions = subscriptionRepository.findByStartDateIsNotNullOrderByExpirationDateDesc().stream()
                .map(subscription -> toDto(subscription, today))
                .toList();

        long active = subscriptions.stream().filter(subscription -> subscription.getStatus() == SubscriptionStatusEnum.ACTIVE).count();
        long expiring = subscriptions.stream().filter(subscription -> subscription.getStatus() == SubscriptionStatusEnum.ACTIVE
                        && subscription.getDaysRemaining() != null
                        && subscription.getDaysRemaining() >= 0
                        && subscription.getDaysRemaining() <= 7)
                .count();
        long expired = subscriptions.stream().filter(subscription -> subscription.getStatus() == SubscriptionStatusEnum.EXPIRED).count();
        return new SubscriptionOverviewDto(subscriptions, active, expiring, expired, subscriptions.size());
    }

    @Transactional
    public List<SubscriptionExpiryAlertDto> getExpiringAlerts() {
        synchronizeExpirationStatuses();
        LocalDate today = LocalDate.now();
        return subscriptionRepository.findByStatusAndExpirationDateBetween(
                        SubscriptionStatusEnum.ACTIVE,
                        today,
                        today.plusDays(7)
                ).stream()
                .map(subscription -> toAlert(subscription, today))
                .sorted(Comparator.comparing(SubscriptionExpiryAlertDto::expirationDate))
                .toList();
    }

    public Payment getCurrentPaidPayment(Subscription subscription) {
        return paymentRepository.findTopBySubscription_IdAndStatusOrderByPaidAtDesc(
                        subscription.getId(),
                        PaymentStatusEnum.paid
                )
                .orElse(null);
    }

    public Payment getPendingRenewal(Subscription subscription) {
        return paymentRepository.findTopBySubscription_IdAndStatusAndPaymentTypeOrderByCreatedAtDesc(
                        subscription.getId(),
                        PaymentStatusEnum.pending,
                        PaymentTypeEnum.RENEWAL
                )
                .orElse(null);
    }

    private SubscriptionDto toDto(Subscription subscription, LocalDate today) {
        Payment payment = getCurrentPaidPayment(subscription);
        Request request = subscription.getRequest();
        long daysRemaining = subscription.getExpirationDate() == null
                ? 0
                : ChronoUnit.DAYS.between(today, subscription.getExpirationDate());
        boolean renewalPending = getPendingRenewal(subscription) != null;
        boolean renewalEligible = !renewalPending
                && subscription.getStatus() != SubscriptionStatusEnum.CANCELLED
                && subscription.getExpirationDate() != null
                && daysRemaining <= 1;

        return new SubscriptionDto(
                subscription.getId(),
                request != null ? request.getId() : null,
                payment != null ? payment.getId() : null,
                resolveBankName(payment, request),
                resolveBankLogoUrl(request),
                request != null ? request.getMarketplaceSlug() : null,
                payment != null ? payment.getAmount() : null,
                payment != null ? payment.getCurrency() : null,
                payment != null ? payment.getPaidAt() : null,
                subscription.getStartDate(),
                subscription.getExpirationDate(),
                subscription.getExpirationDate() == null ? null : daysRemaining,
                subscription.getStatus(),
                renewalEligible,
                renewalPending,
                buildStoreDtos(request)
        );
    }

    private SubscriptionExpiryAlertDto toAlert(Subscription subscription, LocalDate today) {
        Request request = subscription.getRequest();
        Payment payment = getCurrentPaidPayment(subscription);
        long daysRemaining = ChronoUnit.DAYS.between(today, subscription.getExpirationDate());
        return new SubscriptionExpiryAlertDto(
                subscription.getId(),
                resolveBankName(payment, request),
                request != null ? request.getMarketplaceSlug() : null,
                subscription.getExpirationDate(),
                daysRemaining,
                daysRemaining <= 3 ? "Urgent" : "Attention"
        );
    }

    private List<PaidSubscriptionDto.PaidSubscriptionStoreDto> buildStoreDtos(Request request) {
        if (request == null || request.getSelectedStoreDetails() == null) {
            return List.of();
        }
        return request.getSelectedStoreDetails().stream()
                .filter(Objects::nonNull)
                .map(store -> new PaidSubscriptionDto.PaidSubscriptionStoreDto(
                        store.getStoreId(),
                        store.getStoreName(),
                        store.getStoreDescription(),
                        store.getStorePrice(),
                        buildModuleDtos(store.getModules())
                ))
                .toList();
    }

    private List<PaidSubscriptionDto.PaidSubscriptionModuleDto> buildModuleDtos(List<RequestModuleSelection> modules) {
        if (modules == null) {
            return List.of();
        }
        return modules.stream()
                .filter(module -> module != null && module.getModuleId() != null)
                .map(module -> new PaidSubscriptionDto.PaidSubscriptionModuleDto(
                        module.getModuleId(),
                        module.getModuleName(),
                        module.getModuleDescription(),
                        null,
                        module.getModulePrice()
                ))
                .toList();
    }

    private Double resolveRenewalAmount(Subscription subscription, Request original) {
        Payment payment = getCurrentPaidPayment(subscription);
        if (payment != null && payment.getAmount() != null) {
            return payment.getAmount().doubleValue();
        }
        return original.getTotalAmount();
    }

    private void copyStoreSelections(Request original, Request renewal) {
        List<RequestStoreSelection> copies = new java.util.ArrayList<>();
        if (original.getSelectedStoreDetails() == null) {
            renewal.setSelectedStoreDetails(copies);
            return;
        }
        for (RequestStoreSelection sourceStore : original.getSelectedStoreDetails()) {
            RequestStoreSelection store = new RequestStoreSelection();
            store.setRequest(renewal);
            store.setStoreId(sourceStore.getStoreId());
            store.setStoreName(sourceStore.getStoreName());
            store.setStoreDescription(sourceStore.getStoreDescription());
            store.setStorePrice(sourceStore.getStorePrice());
            List<RequestModuleSelection> modules = new java.util.ArrayList<>();
            if (sourceStore.getModules() != null) {
                for (RequestModuleSelection sourceModule : sourceStore.getModules()) {
                    RequestModuleSelection module = new RequestModuleSelection();
                    module.setRequestStore(store);
                    module.setModuleId(sourceModule.getModuleId());
                    module.setModuleName(sourceModule.getModuleName());
                    module.setModuleDescription(sourceModule.getModuleDescription());
                    module.setModulePrice(sourceModule.getModulePrice());
                    module.setParameters(sourceModule.getParameters());
                    modules.add(module);
                }
            }
            store.setModules(modules);
            copies.add(store);
        }
        renewal.setSelectedStoreDetails(copies);
    }

    private void auditRenewalRequest(Request request, String action) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.billing);
        audit.setResourceType("renewal_request");
        audit.setResourceId(String.valueOf(request.getId()));
        audit.setStatus(AuditStatusEnum.success);
        audit.setBankId(request.getBank() != null ? String.valueOf(request.getBank().getId()) : null);
        audit.setMarketplaceId(request.getSubscription() != null && request.getSubscription().getMarketplace() != null
                ? String.valueOf(request.getSubscription().getMarketplace().getId()) : null);
        audit.setCorrelationId("request-" + request.getId());
        auditLogger.logAsync(audit);
    }

    private Marketplace resolveMarketplace(Request request) {
        if (request == null || request.getBank() == null || request.getBank().getMarketplace() == null) {
            throw new IllegalStateException("La marketplace liee a la demande est obligatoire pour creer un abonnement.");
        }
        return request.getBank().getMarketplace();
    }

    private void ensureAnnualDuration(Subscription subscription) {
        if (!Integer.valueOf(DEFAULT_DURATION_MONTHS).equals(subscription.getDurationMonths())) {
            subscription.setDurationMonths(DEFAULT_DURATION_MONTHS);
        }
    }

    private String resolveBankName(Payment payment, Request request) {
        if (payment != null && hasText(payment.getBankName())) {
            return payment.getBankName().trim();
        }
        return request != null && hasText(request.getBankName()) ? request.getBankName().trim() : "Matchia";
    }

    private String resolveBankLogoUrl(Request request) {
        if (request != null && request.getBank() != null && hasText(request.getBank().getLogoUrl())) {
            return request.getBank().getLogoUrl();
        }
        return request != null ? request.getLogoUrl() : null;
    }

    private void updateMarketplaceStatus(Marketplace marketplace) {
        if (marketplace == null || marketplace.getId() == null) {
            return;
        }
        LocalDate today = LocalDate.now();
        boolean hasUsableSubscription = subscriptionRepository.findByMarketplace_Id(marketplace.getId()).stream()
                .anyMatch(subscription -> subscription.getExpirationDate() != null
                        && !subscription.getExpirationDate().isBefore(today)
                        && subscription.getStatus() != SubscriptionStatusEnum.EXPIRED
                        && subscription.getStatus() != SubscriptionStatusEnum.CANCELLED);
        MarketplaceStatusEnum expected = hasUsableSubscription ? MarketplaceStatusEnum.active : MarketplaceStatusEnum.inactive;
        if (marketplace.getStatus() != expected) {
            marketplace.setStatus(expected);
            marketplaceRepository.save(marketplace);
        }
    }

    private void audit(Subscription subscription, String action) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.billing);
        audit.setResourceType("subscription");
        audit.setResourceId(subscription.getId() != null ? String.valueOf(subscription.getId()) : null);
        audit.setStatus(AuditStatusEnum.success);
        audit.setBankId(subscription.getMarketplace() != null && subscription.getMarketplace().getBank() != null
                ? String.valueOf(subscription.getMarketplace().getBank().getId()) : null);
        audit.setMarketplaceId(subscription.getMarketplace() != null ? String.valueOf(subscription.getMarketplace().getId()) : null);
        audit.setCorrelationId(subscription.getRequest() != null ? "request-" + subscription.getRequest().getId() : null);
        auditLogger.logSystemAsync(audit, "PAYMENT_WEBHOOK");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
