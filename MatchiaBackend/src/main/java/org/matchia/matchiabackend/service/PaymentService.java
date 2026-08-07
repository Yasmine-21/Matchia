package org.matchia.matchiabackend.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.PaidSubscriptionDto;
import org.matchia.matchiabackend.dto.MonthlyRevenueDto;
import org.matchia.matchiabackend.dto.SubscriptionExpiryAlertDto;
import org.matchia.matchiabackend.dto.SubscriptionRenewalResponse;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.CheckoutSessionRequest;
import org.matchia.matchiabackend.dto.ConfirmPaymentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentTypeEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.Objects;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private static final Set<String> ZERO_DECIMAL_CURRENCIES = Set.of(
            "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf",
            "ugx", "vnd", "vuv", "xaf", "xof", "xpf"
    );
    private static final Set<String> THREE_DECIMAL_CURRENCIES = Set.of("bhd", "jod", "kwd", "omr", "tnd");

    private final PaymentRepository paymentRepository;
    private final RequestRepository requestRepository;
    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final StoreRequestActivationService storeRequestActivationService;
    private final AuditLogger auditLogger;
    private final EmailService emailService;
    private final SubscriptionService subscriptionService;
    private final BankAdminCredentialsService bankAdminCredentialsService;

    @Value("${payment.page-path:/paiement}")
    private String paymentPagePath;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;

    @Value("${stripe.currency:tnd}")
    private String stripeCurrency;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${stripe.success-url:}")
    private String stripeSuccessUrl;

    @Value("${stripe.cancel-url:}")
    private String stripeCancelUrl;

    @Transactional
    public String initiatePayment(Request request) {
        if (request == null || request.getId() == null) {
            throw new IllegalArgumentException("La demande est obligatoire pour initialiser le paiement.");
        }

        BigDecimal amount = BigDecimal.valueOf(request.getTotalAmount() != null ? request.getTotalAmount() : 0)
                .setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant du paiement doit etre superieur a zero.");
        }

        Payment payment = resolvePendingPayment(null, request);
        payment.setAmount(amount);
        payment.setCurrency(normalizeCurrency(payment.getCurrency()));
        payment.setBankName(hasText(request.getBankName()) ? request.getBankName().trim() : "Matchia");
        Payment savedPayment = paymentRepository.save(payment);

        log.info("Preparation du paiement Stripe integre pour la demande {} et le paiement {}.",
                request.getId(), savedPayment.getId());
        return fallbackPaymentLink(
                request,
                savedPayment.getId(),
                savedPayment.getAmount(),
                savedPayment.getCurrency()
        );
    }

    public String getPublishableKey() {
        if (!hasText(stripePublishableKey)) {
            throw new IllegalStateException("Stripe publishable key is not configured.");
        }
        return stripePublishableKey.trim();
    }

    @Transactional
    public CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest paymentIntentRequest) throws StripeException {
        validatePaymentIntentRequest(paymentIntentRequest);
        Stripe.apiKey = stripeSecretKey;

        Request joinRequest = requestRepository.findById(paymentIntentRequest.getRequestId())
                .orElseThrow(() -> new NoSuchElementException("Demande non trouvee : " + paymentIntentRequest.getRequestId()));

        String requestId = String.valueOf(paymentIntentRequest.getRequestId());
        Payment payment = resolvePendingPayment(paymentIntentRequest.getPaymentId(), joinRequest);
        payment.setSubscription(subscriptionService.resolveOrCreateForPayment(payment));
        String bankName = hasText(payment.getBankName()) ? payment.getBankName()
                : (hasText(paymentIntentRequest.getBankName()) ? paymentIntentRequest.getBankName().trim() : joinRequest.getBankName());
        if (!hasText(bankName)) {
            bankName = "Matchia";
        }
        String currency = normalizeCurrency(payment.getCurrency());
        BigDecimal amount = payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant du renouvellement doit etre superieur a zero.");
        }
        payment.setBankName(bankName);
        Payment savedPayment = paymentRepository.save(payment);

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(toStripeAmount(amount, currency))
                .setCurrency(currency)
                .setDescription("Payment subscription Matchia - " + bankName)
                .putMetadata("request_id", requestId)
                .putMetadata("bank_name", bankName)
                .putMetadata("payment_id", String.valueOf(savedPayment.getId()))
                .addPaymentMethodType("card")
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);
        savedPayment.setStripePaymentIntentId(paymentIntent.getId());
        Payment updatedPayment = paymentRepository.save(savedPayment);
        auditPayment(updatedPayment, "payment.initiated", AuditStatusEnum.success);

        return new CreatePaymentIntentResponse(
                paymentIntent.getClientSecret(),
                updatedPayment.getId(),
                paymentIntent.getId(),
                updatedPayment.getAmount(),
                updatedPayment.getCurrency(),
                updatedPayment.getStatus().name()
        );
    }

    @Transactional
    public CreatePaymentIntentResponse confirmPayment(Long paymentId, ConfirmPaymentRequest confirmPaymentRequest) throws StripeException {
        if (confirmPaymentRequest == null || !hasText(confirmPaymentRequest.getPaymentIntentId())) {
            throw new IllegalArgumentException("paymentIntentId is required.");
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NoSuchElementException("Paiement introuvable : " + paymentId));
        if (!confirmPaymentRequest.getPaymentIntentId().equals(payment.getStripePaymentIntentId())) {
            throw new IllegalArgumentException("paymentIntentId does not match payment.");
        }

        PaymentStatusEnum status = null;
        if (hasText(confirmPaymentRequest.getPaymentIntentStatus())) {
            status = mapStripeStatus(confirmPaymentRequest.getPaymentIntentStatus());
        }

        if (status != PaymentStatusEnum.paid) {
            try {
                Stripe.apiKey = stripeSecretKey;
                // The frontend confirms the card, then the backend reads Stripe as the source of truth when available.
                PaymentIntent paymentIntent = PaymentIntent.retrieve(confirmPaymentRequest.getPaymentIntentId());
                status = mapStripeStatus(paymentIntent.getStatus());
            } catch (StripeException stripeException) {
                log.warn(
                        "Verification Stripe indisponible pour le paiement {}. Fallback sur le statut transmis par le front.",
                        paymentId,
                        stripeException
                );
                if (status == null) {
                    throw stripeException;
                }
            }
        }

        if (status == null) {
            status = PaymentStatusEnum.pending;
        }

        Payment savedPayment = updatePaymentStatusAndProcess(payment, status);

        return new CreatePaymentIntentResponse(
                null,
                savedPayment.getId(),
                savedPayment.getStripePaymentIntentId(),
                savedPayment.getAmount(),
                savedPayment.getCurrency(),
                savedPayment.getStatus().name()
        );
    }

    @Transactional
    public String createCheckoutSession(CheckoutSessionRequest checkoutRequest) throws StripeException {
        validateCheckoutRequest(checkoutRequest);
        Stripe.apiKey = stripeSecretKey;

        Request joinRequest = requestRepository.findById(checkoutRequest.getRequestId())
                .orElseThrow(() -> new NoSuchElementException("Demande non trouvee : " + checkoutRequest.getRequestId()));

        String requestId = String.valueOf(checkoutRequest.getRequestId());
        String bankName = hasText(checkoutRequest.getBankName()) ? checkoutRequest.getBankName().trim() : "Matchia";
        String currency = normalizeCurrency(checkoutRequest.getCurrency());

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(resolveSuccessUrl(requestId))
                .setCancelUrl(resolveCancelUrl(requestId))
                .putMetadata("request_id", requestId)
                .putMetadata("bank_name", bankName)
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(currency)
                                                .setUnitAmount(toStripeAmount(checkoutRequest.getAmount(), currency))
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName("Payment subscription Matchia - " + bankName)
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                )
                .build();

        Session session = Session.create(params);
        if (!hasText(session.getUrl())) {
            throw new IllegalStateException("Stripe n'a pas retourne d'URL de paiement.");
        }

        Payment payment = new Payment();
        payment.setRequest(joinRequest);
        payment.setSubscription(subscriptionService.resolveOrCreateForRequest(joinRequest));
        payment.setStripeSessionId(session.getId());
        payment.setStripePaymentIntentId(session.getPaymentIntent());
        payment.setAmount(checkoutRequest.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatusEnum.pending);
        payment.setCheckoutUrl(session.getUrl());
        payment.setBankName(bankName);
        Payment savedPayment = paymentRepository.save(payment);
        auditPayment(savedPayment, "payment.initiated", AuditStatusEnum.success);

        return session.getUrl();
    }

    @Transactional
    public CreatePaymentIntentResponse confirmCheckoutSession(String sessionId) throws StripeException {
        if (!hasText(sessionId)) {
            throw new IllegalArgumentException("sessionId is required.");
        }

        Payment payment = paymentRepository.findByStripeSessionId(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Session de paiement introuvable."));

        Stripe.apiKey = stripeSecretKey;
        Session session = Session.retrieve(sessionId);
        PaymentStatusEnum status = "paid".equalsIgnoreCase(session.getPaymentStatus())
                || "no_payment_required".equalsIgnoreCase(session.getPaymentStatus())
                ? PaymentStatusEnum.paid
                : PaymentStatusEnum.pending;

        if (status == PaymentStatusEnum.paid) {
            Long expectedAmount = toStripeAmount(payment.getAmount(), payment.getCurrency());
            if (session.getAmountTotal() == null || !expectedAmount.equals(session.getAmountTotal())) {
                throw new IllegalStateException("Le montant confirme par Stripe ne correspond pas au paiement attendu.");
            }
            if (!normalizeCurrency(payment.getCurrency()).equalsIgnoreCase(session.getCurrency())) {
                throw new IllegalStateException("La devise confirmee par Stripe ne correspond pas au paiement attendu.");
            }
            payment.setStripePaymentIntentId(session.getPaymentIntent());
        }

        Payment savedPayment = updatePaymentStatusAndProcess(payment, status);
        return new CreatePaymentIntentResponse(
                null,
                savedPayment.getId(),
                savedPayment.getStripePaymentIntentId(),
                savedPayment.getAmount(),
                savedPayment.getCurrency(),
                savedPayment.getStatus().name()
        );
    }

    @Transactional
    public Payment markRequestPaymentPaid(Long requestId) {
        Request joinRequest = requestRepository.findById(requestId)
                .orElseThrow(() -> new NoSuchElementException("Demande non trouvee : " + requestId));

        Payment payment = paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(requestId)
                .orElseGet(() -> {
                    Payment newPayment = new Payment();
                    newPayment.setRequest(joinRequest);
                    newPayment.setSubscription(subscriptionService.resolveOrCreateForRequest(joinRequest));
                    newPayment.setAmount(BigDecimal.valueOf(joinRequest.getTotalAmount() != null ? joinRequest.getTotalAmount() : 0)
                            .setScale(2, RoundingMode.HALF_UP));
                    newPayment.setCurrency(normalizeCurrency(null));
                    newPayment.setBankName(joinRequest.getBankName());
                    return newPayment;
                });

        if (payment.getStatus() == PaymentStatusEnum.paid && payment.getPaidAt() != null) {
            return payment;
        }

        payment.setSubscription(subscriptionService.resolveOrCreateForPayment(payment));
        payment.setStatus(PaymentStatusEnum.paid);
        payment.setPaidAt(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);
        auditAutomaticPaymentAction(savedPayment, "payment.status_updated");
        try {
            notificationService.createPaymentSuccessNotification(savedPayment.getRequest());
        } catch (Exception e) {
            log.error("Impossible de creer la notification de paiement pour la demande {}.", requestId, e);
        }
        try {
            activateStoreRequestIfNeeded(savedPayment);
        } catch (Exception e) {
            log.error("Impossible d'activer la demande store apres paiement {}.", requestId, e);
        }
        activateSubscriptionIfNeeded(savedPayment);
        return savedPayment;
    }

    @Transactional(readOnly = true)
    public boolean isRequestPaymentAlreadyPaid(Long requestId) {
        return paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(requestId)
                .map(payment -> payment.getStatus() == PaymentStatusEnum.paid && payment.getPaidAt() != null)
                .orElse(false);
    }

    private void activateSubscriptionIfNeeded(Payment payment) {
        if (payment == null || payment.getStatus() != PaymentStatusEnum.paid || payment.getPaidAt() == null) {
            return;
        }
        subscriptionService.activateFromSuccessfulPayment(payment);
        auditAutomaticPaymentAction(payment,
                payment.getPaymentType() == PaymentTypeEnum.RENEWAL ? "subscription.renewed" : "subscription.activation_processed");
    }

    @Transactional
    public SubscriptionRenewalResponse createPaymentForApprovedRenewalRequest(Request renewalRequest) {
        if (renewalRequest == null || renewalRequest.getId() == null
                || renewalRequest.getRequestType() != org.matchia.matchiabackend.entity.enums.RequestTypeEnum.renewal
                || renewalRequest.getStatus() != org.matchia.matchiabackend.entity.enums.RequestStatusEnum.approved
                || renewalRequest.getSubscription() == null || renewalRequest.getOriginalRequest() == null) {
            throw new IllegalArgumentException("La demande de renouvellement approuvee est invalide.");
        }

        Payment existing = paymentRepository.findByRenewalRequest_Id(renewalRequest.getId()).orElse(null);
        if (existing != null) {
            return new SubscriptionRenewalResponse(
                    renewalRequest.getOriginalRequest().getId(), existing.getId(), existing.getCheckoutUrl());
        }

        var subscription = renewalRequest.getSubscription();
        Payment previousPaidPayment = subscriptionService.getCurrentPaidPayment(subscription);
        if (previousPaidPayment == null || previousPaidPayment.getAmount() == null
                || previousPaidPayment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Aucun paiement valide ne permet de calculer le renouvellement.");
        }

        Request originalRequest = renewalRequest.getOriginalRequest();
        Payment payment = new Payment();
        payment.setRequest(originalRequest);
        payment.setRenewalRequest(renewalRequest);
        payment.setSubscription(subscription);
        payment.setRenewedPayment(previousPaidPayment);
        payment.setPaymentType(PaymentTypeEnum.RENEWAL);
        payment.setAmount(previousPaidPayment.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setCurrency(normalizeCurrency(null));
        payment.setStatus(PaymentStatusEnum.pending);
        payment.setBankName(hasText(previousPaidPayment.getBankName())
                ? previousPaidPayment.getBankName() : originalRequest.getBankName());
        Payment saved = paymentRepository.save(payment);

        subscriptionService.markRenewalPending(subscription);
        String paymentLink = fallbackPaymentLink(originalRequest, saved.getId(), saved.getAmount(), previousPaidPayment.getCurrency());
        saved.setCheckoutUrl(paymentLink);
        saved = paymentRepository.save(saved);
        emailService.sendSubscriptionRenewalPaymentInstructions(originalRequest, paymentLink);
        auditPayment(saved, "subscription.renewal_payment_requested", AuditStatusEnum.success);
        return new SubscriptionRenewalResponse(originalRequest.getId(), saved.getId(), paymentLink);
    }

    @Transactional
    public SubscriptionRenewalResponse createSubscriptionRenewal(Long subscriptionPaymentId) throws StripeException {
        Payment originalPayment = paymentRepository.findById(subscriptionPaymentId)
                .orElseThrow(() -> new NoSuchElementException("Abonnement introuvable : " + subscriptionPaymentId));
        if (originalPayment.getStatus() != PaymentStatusEnum.paid || originalPayment.getPaidAt() == null
                || originalPayment.getRequest() == null || originalPayment.getRequest().getBank() == null
                || originalPayment.getAmount() == null || originalPayment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Seul un abonnement paye peut etre renouvele.");
        }

        var subscription = subscriptionService.resolveOrCreateForPayment(originalPayment);
        Payment currentPaidPayment = subscriptionService.getCurrentPaidPayment(subscription);
        if (currentPaidPayment != null) {
            originalPayment = currentPaidPayment;
        }
        Request original = originalPayment.getRequest();
        Payment pendingPayment = subscriptionService.getPendingRenewal(subscription);
        if (pendingPayment != null) {
            String paymentLink = hasText(pendingPayment.getCheckoutUrl())
                    ? pendingPayment.getCheckoutUrl()
                    : fallbackPaymentLink(original, pendingPayment.getId(), pendingPayment.getAmount(), originalPayment.getCurrency());
            return new SubscriptionRenewalResponse(original.getId(), pendingPayment.getId(), paymentLink);
        }

        Payment renewalPayment = new Payment();
        renewalPayment.setRequest(original);
        renewalPayment.setSubscription(subscription);
        renewalPayment.setRenewedPayment(originalPayment);
        renewalPayment.setPaymentType(PaymentTypeEnum.RENEWAL);
        renewalPayment.setAmount(originalPayment.getAmount().setScale(2, RoundingMode.HALF_UP));
        // Stripe charges renewals in the configured settlement currency (USD),
        // while the payment link and e-mail keep showing the source price in TND.
        renewalPayment.setCurrency(normalizeCurrency(null));
        renewalPayment.setStatus(PaymentStatusEnum.pending);
        renewalPayment.setBankName(hasText(originalPayment.getBankName()) ? originalPayment.getBankName() : original.getBankName());
        Payment savedPayment = paymentRepository.save(renewalPayment);
        subscriptionService.markRenewalPending(subscription);

        String paymentLink = fallbackPaymentLink(original, savedPayment.getId(), savedPayment.getAmount(), originalPayment.getCurrency());
        savedPayment.setCheckoutUrl(paymentLink);
        paymentRepository.save(savedPayment);
        emailService.sendSubscriptionRenewalPaymentInstructions(original, paymentLink);
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction("subscription.renewal_requested");
        audit.setCategory(AuditCategoryEnum.billing);
        audit.setResourceType("payment_renewal");
        audit.setResourceId(String.valueOf(savedPayment.getId()));
        audit.setStatus(AuditStatusEnum.success);
        audit.setCorrelationId("request-" + original.getId());
        auditLogger.logAsync(audit);
        return new SubscriptionRenewalResponse(original.getId(), savedPayment.getId(), paymentLink);
    }

    private void auditPayment(Payment payment, String action, AuditStatusEnum status) {
        AuditLogRequest audit = paymentAudit(payment, action, status);
        auditLogger.logAsync(audit);
    }

    private void auditAutomaticPaymentAction(Payment payment, String action) {
        AuditLogRequest audit = paymentAudit(payment, action, AuditStatusEnum.success);
        auditLogger.logSystemAsync(audit, "PAYMENT_WEBHOOK");
    }

    private AuditLogRequest paymentAudit(Payment payment, String action, AuditStatusEnum status) {
        Request request = payment != null ? payment.getRequest() : null;
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.billing);
        audit.setResourceType("payment");
        audit.setResourceId(payment != null && payment.getId() != null ? String.valueOf(payment.getId()) : null);
        audit.setStatus(status);
        audit.setAffectedUserName(request != null ? request.getContactName() : null);
        audit.setEmailRecipient(request != null ? request.getContactEmail() : null);
        audit.setBankId(request != null && request.getBank() != null && request.getBank().getId() != null
                ? String.valueOf(request.getBank().getId()) : null);
        audit.setMarketplaceId(request != null && request.getBank() != null && request.getBank().getMarketplace() != null
                && request.getBank().getMarketplace().getId() != null
                ? String.valueOf(request.getBank().getMarketplace().getId()) : null);
        audit.setCorrelationId(request != null && request.getId() != null ? "request-" + request.getId() : null);
        return audit;
    }

    @Transactional
    public List<PaidSubscriptionDto> getPaidSubscriptions() {
        subscriptionService.synchronizeExpirationStatuses();
        return paymentRepository.findByStatusOrderByPaidAtDesc(PaymentStatusEnum.paid).stream()
                .map(this::toPaidSubscriptionDto)
                .toList();
    }

    /**
     * Returns the current calendar year, including months without a paid payment.
     * Only payments in the paid state contribute to platform revenue.
     */
    @Transactional(readOnly = true)
    public List<MonthlyRevenueDto> getMonthlyRevenue() {
        YearMonth currentMonth = YearMonth.now();
        YearMonth firstMonth = YearMonth.of(currentMonth.getYear(), 1);
        LocalDateTime start = firstMonth.atDay(1).atStartOfDay();
        LocalDateTime end = firstMonth.plusYears(1).atDay(1).atStartOfDay();

        Map<YearMonth, BigDecimal> revenueByMonth = paymentRepository
                .findByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThan(PaymentStatusEnum.paid, start, end)
                .stream()
                .filter(payment -> payment.getAmount() != null && payment.getPaidAt() != null)
                .collect(Collectors.groupingBy(
                        payment -> YearMonth.from(payment.getPaidAt()),
                        Collectors.reducing(BigDecimal.ZERO, Payment::getAmount, BigDecimal::add)
                ));

        List<MonthlyRevenueDto> monthlyRevenue = new ArrayList<>();
        for (int offset = 0; offset < 12; offset++) {
            YearMonth month = firstMonth.plusMonths(offset);
            monthlyRevenue.add(new MonthlyRevenueDto(
                    month.toString(),
                    revenueByMonth.getOrDefault(month, BigDecimal.ZERO),
                    "TND"
            ));
        }
        return monthlyRevenue;
    }

    /**
     * Returns active subscriptions that expire within the next seven calendar days.
     * A subscription is excluded only when a successful renewal payment explicitly
     * references it. Independent subscriptions of the same marketplace are retained.
     */
    @Transactional
    public List<SubscriptionExpiryAlertDto> getExpiringSubscriptionAlerts() {
        return subscriptionService.getExpiringAlerts();
    }

    @Scheduled(fixedDelayString = "${app.subscription-status-sync-ms:3600000}")
    @Transactional
    public void syncExpiredMarketplaceSubscriptions() {
        subscriptionService.synchronizeExpirationStatuses();
    }

    private String fallbackPaymentLink(Request request) {
        return fallbackPaymentLink(request, null, null, null);
    }

    private String fallbackPaymentLink(Request request, Long paymentId) {
        return fallbackPaymentLink(request, paymentId, null, null);
    }

    private String fallbackPaymentLink(Request request, Long paymentId, BigDecimal paymentAmount, String paymentCurrency) {
        String bankName = request.getBankName() != null ? request.getBankName() : "bank";
        String amount = paymentAmount != null ? paymentAmount.toPlainString()
                : (request.getTotalAmount() != null ? String.valueOf(request.getTotalAmount()) : "0");
        String currency = hasText(paymentCurrency) ? paymentCurrency.trim().toLowerCase() : normalizeCurrency(null);
        String email = hasText(request.getContactEmail()) ? request.getContactEmail().trim()
                : (hasText(request.getBankEmail()) ? request.getBankEmail().trim() : "");
        String normalizedPath = hasText(paymentPagePath) ? paymentPagePath.trim() : "/paiement";
        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }
        String link = frontendUrl.replaceAll("/+$", "") + normalizedPath
                + "?request_id=" + request.getId()
                + "&bank=" + encode(bankName)
                + "&amount=" + encode(amount)
                + "&currency=" + encode(currency)
                + "&email=" + encode(email);
        return paymentId == null ? link : link + "&payment_id=" + paymentId;
    }

    private Payment resolvePendingPayment(Long paymentId, Request request) {
        if (paymentId != null) {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new NoSuchElementException("Paiement introuvable : " + paymentId));
            if (payment.getRequest() == null || !Objects.equals(payment.getRequest().getId(), request.getId())
                    || payment.getStatus() != PaymentStatusEnum.pending) {
                throw new IllegalArgumentException("Le paiement ne correspond pas a la demande de renouvellement.");
            }
            return payment;
        }

        return paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(request.getId())
                .filter(payment -> payment.getStatus() == PaymentStatusEnum.pending)
                .orElseGet(() -> {
                    Payment payment = new Payment();
                    payment.setRequest(request);
                    payment.setSubscription(subscriptionService.resolveOrCreateForRequest(request));
                    payment.setAmount(BigDecimal.valueOf(request.getTotalAmount() != null ? request.getTotalAmount() : 0)
                            .setScale(2, RoundingMode.HALF_UP));
                    payment.setCurrency(normalizeCurrency(null));
                    payment.setStatus(PaymentStatusEnum.pending);
                    payment.setBankName(request.getBankName());
                    return paymentRepository.save(payment);
                });
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private Long toStripeAmount(BigDecimal amount, String currency) {
        BigDecimal safeAmount = amount != null && amount.compareTo(BigDecimal.ZERO) > 0 ? amount : BigDecimal.ZERO;
        int multiplier = currencyMultiplier(currency);
        return safeAmount.multiply(BigDecimal.valueOf(multiplier)).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private int currencyMultiplier(String currency) {
        String normalizedCurrency = normalizeCurrency(currency);
        if (ZERO_DECIMAL_CURRENCIES.contains(normalizedCurrency)) {
            return 1;
        }
        if (THREE_DECIMAL_CURRENCIES.contains(normalizedCurrency)) {
            return 1000;
        }
        return 100;
    }

    private String resolveSuccessUrl(String requestId) {
        String template = hasText(stripeSuccessUrl)
                ? stripeSuccessUrl
                : frontendUrl + "/payment-success?request_id={REQUEST_ID}&session_id={CHECKOUT_SESSION_ID}";
        String resolved = template.replace("{REQUEST_ID}", requestId);
        if (!resolved.contains("{CHECKOUT_SESSION_ID}")) {
            resolved += (resolved.contains("?") ? "&" : "?") + "session_id={CHECKOUT_SESSION_ID}";
        }
        return resolved;
    }

    private String resolveCancelUrl(String requestId) {
        String template = hasText(stripeCancelUrl)
                ? stripeCancelUrl
                : frontendUrl + "/payment-cancel?request_id={REQUEST_ID}";
        return template.replace("{REQUEST_ID}", requestId);
    }

    private void validateCheckoutRequest(CheckoutSessionRequest request) {
        if (!hasText(stripeSecretKey)) {
            throw new IllegalStateException("Stripe secret key is not configured.");
        }
        if (request == null || request.getRequestId() == null) {
            throw new IllegalArgumentException("requestId is required.");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0.");
        }
        if (!hasText(request.getCurrency())) {
            throw new IllegalArgumentException("currency is required.");
        }
    }

    private void validatePaymentIntentRequest(CreatePaymentIntentRequest request) {
        if (!hasText(stripeSecretKey)) {
            throw new IllegalStateException("Stripe secret key is not configured.");
        }
        if (request == null || request.getRequestId() == null) {
            throw new IllegalArgumentException("requestId is required.");
        }
    }

    private PaymentStatusEnum mapStripeStatus(String stripeStatus) {
        if ("succeeded".equals(stripeStatus)) {
            return PaymentStatusEnum.paid;
        }
        if ("canceled".equals(stripeStatus)) {
            return PaymentStatusEnum.cancelled;
        }
        if ("requires_payment_method".equals(stripeStatus)) {
            return PaymentStatusEnum.failed;
        }
        return PaymentStatusEnum.pending;
    }

    private Payment updatePaymentStatusAndProcess(Payment payment, PaymentStatusEnum status) {
        boolean wasAlreadyPaid = payment.getStatus() == PaymentStatusEnum.paid && payment.getPaidAt() != null;
        payment.setStatus(status != null ? status : PaymentStatusEnum.pending);
        if (payment.getStatus() == PaymentStatusEnum.paid && payment.getPaidAt() == null) {
            payment.setPaidAt(LocalDateTime.now());
        }
        Payment savedPayment = paymentRepository.save(payment);
        auditPayment(
                savedPayment,
                savedPayment.getStatus() == PaymentStatusEnum.paid ? "payment.completed" : "payment.status_updated",
                AuditStatusEnum.success
        );
        if (savedPayment.getStatus() == PaymentStatusEnum.paid && !wasAlreadyPaid) {
            auditAutomaticPaymentAction(savedPayment, "payment.status_updated");
            activateJoinRequestActors(savedPayment);
            try {
                notificationService.createPaymentSuccessNotification(savedPayment.getRequest());
            } catch (Exception exception) {
                log.error("Impossible de creer la notification de paiement pour le paiement {}.", savedPayment.getId(), exception);
            }
            try {
                activateStoreRequestIfNeeded(savedPayment);
                auditAutomaticPaymentAction(savedPayment, "subscription.activation_processed");
            } catch (Exception exception) {
                log.error("Impossible d'activer la demande store apres paiement {}.", savedPayment.getId(), exception);
            }
            activateSubscriptionIfNeeded(savedPayment);
            bankAdminCredentialsService.issueAfterSuccessfulMarketplacePayment(savedPayment.getRequest());
        }
        return savedPayment;
    }

    private void activateJoinRequestActors(Payment payment) {
        Request request = payment.getRequest();
        if (request == null || request.getRequestType() != RequestTypeEnum.join || request.getBank() == null) {
            return;
        }

        Bank bank = request.getBank();
        bank.setStatus(BankStatusEnum.active);
        bankRepository.save(bank);

        Marketplace marketplace = bank.getMarketplace();
        if (marketplace != null) {
            marketplace.setStatus(MarketplaceStatusEnum.active);
            marketplaceRepository.save(marketplace);
        }

        String adminEmail = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
        if (hasText(adminEmail)) {
            userRepository.findByEmailIgnoreCase(adminEmail).ifPresent(admin -> {
                admin.setStatus(UserStatusEnum.active);
                userRepository.save(admin);
            });
        }
    }

    private String normalizeCurrency(String currency) {
        if (hasText(currency)) {
            return currency.trim().toLowerCase();
        }
        String platformCurrency = hasText(stripeCurrency) ? stripeCurrency.trim().toLowerCase() : "tnd";
        return platformCurrency;
    }

    private void activateStoreRequestIfNeeded(Payment payment) {
        if (payment == null || payment.getRequest() == null || payment.getRequest().getRequestType() != RequestTypeEnum.store) {
            return;
        }
        storeRequestActivationService.activateAfterPayment(payment.getRequest(), payment);
    }

    private PaidSubscriptionDto toPaidSubscriptionDto(Payment payment) {
        Request request = payment.getRequest();
        String bankName = hasText(payment.getBankName())
                ? payment.getBankName().trim()
                : (request != null && hasText(request.getBankName()) ? request.getBankName().trim() : "Matchia");
        return new PaidSubscriptionDto(
                payment.getId(),
                request != null ? request.getId() : null,
                bankName,
                resolveBankLogoUrl(payment, request),
                request != null ? request.getMarketplaceSlug() : null,
                payment.getAmount(),
                payment.getCurrency(),
                payment.getPaidAt(),
                buildStoreDtos(request)
        );
    }

    private List<PaidSubscriptionDto.PaidSubscriptionStoreDto> buildStoreDtos(Request request) {
        if (request == null || request.getSelectedStoreDetails() == null || request.getSelectedStoreDetails().isEmpty()) {
            return List.of();
        }

        return request.getSelectedStoreDetails().stream()
                .filter(Objects::nonNull)
                .map(storeSelection -> new PaidSubscriptionDto.PaidSubscriptionStoreDto(
                        storeSelection.getStoreId(),
                        storeSelection.getStoreName(),
                        storeSelection.getStoreDescription(),
                        storeSelection.getStorePrice(),
                        buildModuleDtos(storeSelection.getModules())
                ))
                .collect(Collectors.toList());
    }

    private List<PaidSubscriptionDto.PaidSubscriptionModuleDto> buildModuleDtos(List<RequestModuleSelection> modules) {
        if (modules == null || modules.isEmpty()) {
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
                .collect(Collectors.toList());
    }

    private String resolveBankLogoUrl(Payment payment, Request request) {
        if (request != null && request.getBank() != null && hasText(request.getBank().getLogoUrl())) {
            return request.getBank().getLogoUrl();
        }
        if (request != null && hasText(request.getLogoUrl())) {
            return request.getLogoUrl();
        }
        if (hasText(payment.getBankName())) {
            return null;
        }
        return null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
