package org.matchia.matchiabackend.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.CheckoutSessionRequest;
import org.matchia.matchiabackend.dto.ConfirmPaymentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentResponse;
import org.matchia.matchiabackend.dto.PaidSubscriptionDto;
import org.matchia.matchiabackend.dto.MonthlyRevenueDto;
import org.matchia.matchiabackend.dto.SubscriptionExpiryAlertDto;
import org.matchia.matchiabackend.dto.SubscriptionRenewalResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.Subscription;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private RequestRepository requestRepository;
    @Mock private BankRepository bankRepository;
    @Mock private MarketplaceRepository marketplaceRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private StoreRequestActivationService storeRequestActivationService;
    @Mock private AuditLogger auditLogger;
    @Mock private EmailService emailService;
    @Mock private SubscriptionService subscriptionService;
    @Mock private BankAdminCredentialsService bankAdminCredentialsService;

    @InjectMocks
    private PaymentService paymentService;

    private MockedStatic<PaymentIntent> paymentIntentMockedStatic;
    private MockedStatic<Session> sessionMockedStatic;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "stripeSecretKey", "sk_test_123");
        ReflectionTestUtils.setField(paymentService, "stripePublishableKey", "pk_test_123");
        ReflectionTestUtils.setField(paymentService, "stripeCurrency", "tnd");
        ReflectionTestUtils.setField(paymentService, "frontendUrl", "http://localhost:5173");

        paymentIntentMockedStatic = Mockito.mockStatic(PaymentIntent.class);
        sessionMockedStatic = Mockito.mockStatic(Session.class);
    }

    @AfterEach
    void tearDown() {
        if (paymentIntentMockedStatic != null) {
            paymentIntentMockedStatic.close();
        }
        if (sessionMockedStatic != null) {
            sessionMockedStatic.close();
        }
    }

    @Test
    void initiatePayment_success() {
        Request request = new Request();
        request.setId(1L);
        request.setTotalAmount(100.0);
        request.setBankName("My Bank");

        Payment payment = new Payment();
        payment.setId(10L);
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("tnd");

        when(paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(payment));
        payment.setStatus(PaymentStatusEnum.pending);
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        String link = paymentService.initiatePayment(request);

        assertThat(link).contains("request_id=1");
        assertThat(link).contains("amount=100");
    }

    @Test
    void createPaymentIntent_success() throws StripeException {
        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest();
        request.setRequestId(1L);
        request.setBankName("My Bank");

        Request joinRequest = new Request();
        joinRequest.setId(1L);

        Payment payment = new Payment();
        payment.setId(10L);
        payment.setAmount(BigDecimal.valueOf(100.0));
        payment.setCurrency("tnd");
        payment.setStatus(PaymentStatusEnum.pending);

        when(requestRepository.findById(1L)).thenReturn(Optional.of(joinRequest));
        when(paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(payment));
        when(subscriptionService.resolveOrCreateForPayment(payment)).thenReturn(new Subscription());
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        PaymentIntent mockIntent = mock(PaymentIntent.class);
        when(mockIntent.getId()).thenReturn("pi_123");
        when(mockIntent.getClientSecret()).thenReturn("secret_123");
        
        paymentIntentMockedStatic.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                .thenReturn(mockIntent);

        CreatePaymentIntentResponse response = paymentService.createPaymentIntent(request);

        assertThat(response).isNotNull();
        assertThat(response.getPaymentIntentId()).isEqualTo("pi_123");
        assertThat(response.getClientSecret()).isEqualTo("secret_123");
        verify(auditLogger).logAsync(any());
    }

    @Test
    void confirmPayment_success() throws StripeException {
        ConfirmPaymentRequest request = new ConfirmPaymentRequest();
        request.setPaymentIntentId("pi_123");
        request.setPaymentIntentStatus("succeeded");

        Payment payment = new Payment();
        payment.setId(10L);
        payment.setStripePaymentIntentId("pi_123");
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("tnd");
        payment.setStatus(PaymentStatusEnum.pending);

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        CreatePaymentIntentResponse response = paymentService.confirmPayment(10L, request);

        assertThat(response.getStatus()).isEqualTo(PaymentStatusEnum.paid.name());
        verify(paymentRepository, times(1)).save(payment);
    }

    @Test
    void confirmPayment_missingIntent_throwsException() {
        ConfirmPaymentRequest request = new ConfirmPaymentRequest();
        assertThatThrownBy(() -> paymentService.confirmPayment(1L, request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createCheckoutSession_success() throws StripeException {
        CheckoutSessionRequest request = new CheckoutSessionRequest();
        request.setRequestId(1L);
        request.setAmount(BigDecimal.valueOf(100));
        request.setCurrency("tnd");

        Request joinRequest = new Request();
        joinRequest.setId(1L);

        when(requestRepository.findById(1L)).thenReturn(Optional.of(joinRequest));
        when(subscriptionService.resolveOrCreateForRequest(joinRequest)).thenReturn(new Subscription());
        
        Payment payment = new Payment();
        payment.setId(10L);
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("tnd");
        payment.setStatus(PaymentStatusEnum.pending);
        
        when(paymentRepository.save(any())).thenReturn(payment);

        Session mockSession = mock(Session.class);
        when(mockSession.getId()).thenReturn("cs_123");
        when(mockSession.getUrl()).thenReturn("http://checkout.url");
        when(mockSession.getPaymentIntent()).thenReturn("pi_123");

        sessionMockedStatic.when(() -> Session.create(any(SessionCreateParams.class)))
                .thenReturn(mockSession);

        String url = paymentService.createCheckoutSession(request);

        assertThat(url).isEqualTo("http://checkout.url");
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void confirmCheckoutSession_success() throws StripeException {
        Payment payment = new Payment();
        payment.setId(10L);
        payment.setStripeSessionId("cs_123");
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("tnd");
        payment.setStatus(PaymentStatusEnum.pending);

        when(paymentRepository.findByStripeSessionId("cs_123")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        Session mockSession = mock(Session.class);
        when(mockSession.getPaymentStatus()).thenReturn("paid");
        when(mockSession.getAmountTotal()).thenReturn(100000L); // 100 * 1000 for tnd
        when(mockSession.getCurrency()).thenReturn("tnd");
        when(mockSession.getPaymentIntent()).thenReturn("pi_123");

        sessionMockedStatic.when(() -> Session.retrieve("cs_123")).thenReturn(mockSession);

        CreatePaymentIntentResponse response = paymentService.confirmCheckoutSession("cs_123");

        assertThat(response.getStatus()).isEqualTo(PaymentStatusEnum.paid.name());
        verify(paymentRepository).save(payment);
    }

    @Test
    void markRequestPaymentPaid_success() {
        Request request = new Request();
        request.setId(1L);

        Payment payment = new Payment();
        payment.setId(10L);
        payment.setRequest(request);
        payment.setStatus(PaymentStatusEnum.pending);

        when(requestRepository.findById(1L)).thenReturn(Optional.of(request));
        when(paymentRepository.findTopByRequest_IdOrderByCreatedAtDesc(1L)).thenReturn(Optional.of(payment));
        when(subscriptionService.resolveOrCreateForPayment(payment)).thenReturn(new Subscription());
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        Payment result = paymentService.markRequestPaymentPaid(1L);

        assertThat(result.getStatus()).isEqualTo(PaymentStatusEnum.paid);
        assertThat(result.getPaidAt()).isNotNull();
    }

    @Test
    void createPaymentForApprovedRenewalRequest_success() {
        Request renewal = new Request();
        renewal.setId(1L);
        renewal.setRequestType(RequestTypeEnum.renewal);
        renewal.setStatus(RequestStatusEnum.approved);
        
        Subscription sub = new Subscription();
        renewal.setSubscription(sub);
        
        Request orig = new Request();
        orig.setId(2L);
        renewal.setOriginalRequest(orig);

        when(paymentRepository.findByRenewalRequest_Id(1L)).thenReturn(Optional.empty());

        Payment oldPayment = new Payment();
        oldPayment.setAmount(BigDecimal.valueOf(100));
        oldPayment.setCurrency("tnd");
        when(subscriptionService.getCurrentPaidPayment(sub)).thenReturn(oldPayment);

        Payment savedPayment = new Payment();
        savedPayment.setId(10L);
        savedPayment.setAmount(BigDecimal.valueOf(100));
        savedPayment.setCurrency("tnd");
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);

        SubscriptionRenewalResponse response = paymentService.createPaymentForApprovedRenewalRequest(renewal);

        assertThat(response).isNotNull();
        assertThat(response.paymentId()).isEqualTo(10L);
        verify(subscriptionService).markRenewalPending(sub);
        verify(emailService).sendSubscriptionRenewalPaymentInstructions(eq(orig), anyString());
    }

    @Test
    void getPaidSubscriptions_success() {
        Payment p = new Payment();
        p.setId(1L);
        Request r = new Request();
        r.setId(2L);
        r.setBankName("TestBank");
        p.setRequest(r);
        
        when(paymentRepository.findByStatusOrderByPaidAtDesc(PaymentStatusEnum.paid)).thenReturn(List.of(p));
        
        List<PaidSubscriptionDto> res = paymentService.getPaidSubscriptions();
        
        assertThat(res).hasSize(1);
        assertThat(res.get(0).getBankName()).isEqualTo("TestBank");
    }

    @Test
    void exposesBillingDashboardDataAndValidatesPublishableKey() {
        Payment january = new Payment(); january.setAmount(BigDecimal.valueOf(12)); january.setPaidAt(YearMonth.now().withMonth(1).atDay(5).atStartOfDay());
        Payment ignored = new Payment(); ignored.setAmount(null); ignored.setPaidAt(LocalDateTime.now());
        when(paymentRepository.findByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThan(eq(PaymentStatusEnum.paid), any(), any()))
                .thenReturn(List.of(january, ignored));
        List<MonthlyRevenueDto> revenue = paymentService.getMonthlyRevenue();
        assertThat(revenue).hasSize(12);
        assertThat(revenue).anyMatch(month -> month.month().equals(YearMonth.now().withMonth(1).toString()) && month.revenue().compareTo(BigDecimal.valueOf(12)) == 0);

        List<SubscriptionExpiryAlertDto> alerts = List.of();
        when(subscriptionService.getExpiringAlerts()).thenReturn(alerts);
        assertThat(paymentService.getExpiringSubscriptionAlerts()).isSameAs(alerts);
        paymentService.syncExpiredMarketplaceSubscriptions();
        verify(subscriptionService, atLeastOnce()).synchronizeExpirationStatuses();
        assertThat(paymentService.getPublishableKey()).isEqualTo("pk_test_123");
        ReflectionTestUtils.setField(paymentService, "stripePublishableKey", " ");
        assertThatThrownBy(() -> paymentService.getPublishableKey()).isInstanceOf(IllegalStateException.class);
    }
}
