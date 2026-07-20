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
import org.matchia.matchiabackend.dto.CheckoutSessionRequest;
import org.matchia.matchiabackend.dto.ConfirmPaymentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentResponse;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.RequestStoreSelection;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.Objects;
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
    private final MarketplaceRepository marketplaceRepository;
    private final NotificationService notificationService;
    private final StoreRequestActivationService storeRequestActivationService;

    @Value("${payment.demo-url:http://lvh.me:5173/payment/demo}")
    private String demoPaymentUrl;

    @Value("${stripe.secret-key:${stripe.secret.key:}}")
    private String stripeSecretKey;

    @Value("${stripe.publishable.key:${stripe.public.key:}}")
    private String stripePublishableKey;

    @Value("${stripe.currency:tnd}")
    private String stripeCurrency;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${stripe.success-url:}")
    private String stripeSuccessUrl;

    @Value("${stripe.cancel-url:}")
    private String stripeCancelUrl;

    public String initiatePayment(Request request) {
        log.info("Generation du lien de paiement integre pour la demande {}.", request.getId());
        return fallbackPaymentLink(request);
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
        String bankName = hasText(paymentIntentRequest.getBankName()) ? paymentIntentRequest.getBankName().trim() : joinRequest.getBankName();
        if (!hasText(bankName)) {
            bankName = "Matchia";
        }
        String currency = normalizeCurrency(paymentIntentRequest.getCurrency());
        BigDecimal amount = paymentIntentRequest.getAmount().setScale(2, RoundingMode.HALF_UP);

        Payment payment = new Payment();
        payment.setRequest(joinRequest);
        payment.setAmount(amount);
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatusEnum.pending);
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

        payment.setStatus(status);
        if (status == PaymentStatusEnum.paid && payment.getPaidAt() == null) {
            payment.setPaidAt(LocalDateTime.now());
        }
        Payment savedPayment = paymentRepository.save(payment);
        if (savedPayment.getStatus() == PaymentStatusEnum.paid) {
            try {
                notificationService.createPaymentSuccessNotification(savedPayment.getRequest());
            } catch (Exception e) {
                log.error("Impossible de creer la notification de paiement pour le paiement {}.", savedPayment.getId(), e);
            }
            try {
                activateStoreRequestIfNeeded(savedPayment);
            } catch (Exception e) {
                log.error("Impossible d'activer la demande store apres paiement {}.", savedPayment.getId(), e);
            }
        }

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
        payment.setStripeSessionId(session.getId());
        payment.setStripePaymentIntentId(session.getPaymentIntent());
        payment.setAmount(checkoutRequest.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatusEnum.pending);
        payment.setCheckoutUrl(session.getUrl());
        payment.setBankName(bankName);
        paymentRepository.save(payment);

        return session.getUrl();
    }

    @Transactional
    public Payment markRequestPaymentPaid(Long requestId) {
        Request joinRequest = requestRepository.findById(requestId)
                .orElseThrow(() -> new NoSuchElementException("Demande non trouvee : " + requestId));

        Payment payment = paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(requestId)
                .orElseGet(() -> {
                    Payment newPayment = new Payment();
                    newPayment.setRequest(joinRequest);
                    newPayment.setAmount(BigDecimal.valueOf(joinRequest.getTotalAmount() != null ? joinRequest.getTotalAmount() : 0)
                            .setScale(2, RoundingMode.HALF_UP));
                    newPayment.setCurrency(normalizeCurrency(null));
                    newPayment.setBankName(joinRequest.getBankName());
                    return newPayment;
                });

        payment.setStatus(PaymentStatusEnum.paid);
        payment.setPaidAt(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);
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
        return savedPayment;
    }

    @Transactional
    public List<PaidSubscriptionDto> getPaidSubscriptions() {
        syncMarketplaceStatusesFromPaidSubscriptions();
        return paymentRepository.findByStatusOrderByPaidAtDesc(PaymentStatusEnum.paid).stream()
                .map(this::toPaidSubscriptionDto)
                .toList();
    }

    @Scheduled(fixedDelayString = "${app.subscription-status-sync-ms:3600000}")
    @Transactional
    public void syncExpiredMarketplaceSubscriptions() {
        syncMarketplaceStatusesFromPaidSubscriptions();
    }

    private String fallbackPaymentLink(Request request) {
        String bankName = request.getBankName() != null ? request.getBankName() : "bank";
        String amount = request.getTotalAmount() != null ? String.valueOf(request.getTotalAmount()) : "0";
        return demoPaymentUrl
                + "?request_id=" + request.getId()
                + "&bank=" + encode(bankName)
                + "&amount=" + encode(amount)
                + "&currency=" + encode(stripeCurrency);
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
                : frontendUrl + "/payment-success?request_id={REQUEST_ID}";
        return template.replace("{REQUEST_ID}", requestId);
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
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0.");
        }
        if (!hasText(request.getCurrency())) {
            throw new IllegalArgumentException("currency is required.");
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

    private String normalizeCurrency(String currency) {
        String platformCurrency = hasText(stripeCurrency) ? stripeCurrency.trim().toLowerCase() : "tnd";
        if (hasText(currency) && !platformCurrency.equals(currency.trim().toLowerCase())) {
            log.warn("Devise de paiement {} ignoree : la plateforme utilise {}.", currency, platformCurrency);
        }
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

    private void syncMarketplaceStatusesFromPaidSubscriptions() {
        List<Payment> paidPayments = paymentRepository.findByStatusOrderByPaidAtDesc(PaymentStatusEnum.paid);
        Map<Long, Payment> latestPaymentByRequest = new LinkedHashMap<>();

        for (Payment payment : paidPayments) {
            Request request = payment.getRequest();
            if (request == null || request.getId() == null || latestPaymentByRequest.containsKey(request.getId())) {
                continue;
            }
            latestPaymentByRequest.put(request.getId(), payment);
        }

        for (Payment payment : latestPaymentByRequest.values()) {
            Request request = payment.getRequest();
            if (request == null || request.getBank() == null) {
                continue;
            }

            Marketplace marketplace = request.getBank().getMarketplace();
            if (marketplace == null) {
                continue;
            }

            LocalDateTime paidAt = payment.getPaidAt();
            if (paidAt == null) {
                continue;
            }

            LocalDateTime expirationDate = paidAt.plus(1, ChronoUnit.MONTHS);
            boolean expired = expirationDate.isBefore(LocalDateTime.now(ZoneId.systemDefault()));
            MarketplaceStatusEnum desiredStatus = expired ? MarketplaceStatusEnum.inactive : MarketplaceStatusEnum.active;

            if (marketplace.getStatus() != desiredStatus) {
                marketplace.setStatus(desiredStatus);
                marketplaceRepository.save(marketplace);
            }
        }
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
