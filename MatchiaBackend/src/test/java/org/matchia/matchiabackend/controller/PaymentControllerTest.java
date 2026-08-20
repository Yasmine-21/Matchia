package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.*;
import org.matchia.matchiabackend.service.PaymentService;

import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PaymentControllerTest {

    @Test
    void exposesConfigurationAndPaymentDashboards() {
        PaymentService service = mock(PaymentService.class);
        PaymentController controller = new PaymentController(service);
        when(service.getPublishableKey()).thenReturn("pk_test");
        when(service.getPaidSubscriptions()).thenReturn(List.of());
        when(service.getMonthlyRevenue()).thenReturn(List.of());
        when(service.getExpiringSubscriptionAlerts()).thenReturn(List.of());

        assertThat(controller.getPaymentConfig().getBody().getPublishableKey()).isEqualTo("pk_test");
        assertThat(controller.getPaidSubscriptions().getBody()).isEmpty();
        assertThat(controller.getMonthlyRevenue().getBody()).isEmpty();
        assertThat(controller.getExpiringSubscriptions().getBody()).isEmpty();
        when(service.getPublishableKey()).thenThrow(new IllegalStateException());
        assertThat(controller.getPaymentConfig().getStatusCode().value()).isEqualTo(503);
    }

    @Test
    void createsAndConfirmsPaymentIntentsWithClientErrorsMapped() throws Exception {
        PaymentService service = mock(PaymentService.class);
        PaymentController controller = new PaymentController(service);
        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest();
        ConfirmPaymentRequest confirmation = new ConfirmPaymentRequest();
        CreatePaymentIntentResponse response = new CreatePaymentIntentResponse();
        when(service.createPaymentIntent(request)).thenReturn(response);
        when(service.confirmPayment(1L, confirmation)).thenReturn(response);

        assertThat(controller.createPaymentIntent(request).getBody()).isSameAs(response);
        assertThat(controller.confirmPayment(1L, confirmation).getBody()).isSameAs(response);
        when(service.createPaymentIntent(request)).thenThrow(new IllegalArgumentException());
        when(service.confirmPayment(2L, confirmation)).thenThrow(new NoSuchElementException());
        assertThat(controller.createPaymentIntent(request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.confirmPayment(2L, confirmation).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void handlesCheckoutConfirmationAndRenewalFlows() throws Exception {
        PaymentService service = mock(PaymentService.class);
        PaymentController controller = new PaymentController(service);
        CheckoutSessionRequest checkout = new CheckoutSessionRequest();
        CreatePaymentIntentResponse confirmed = new CreatePaymentIntentResponse();
        SubscriptionRenewalResponse renewal = new SubscriptionRenewalResponse(1L, 1L, "https://renew");
        when(service.createCheckoutSession(checkout)).thenReturn("https://checkout");
        when(service.confirmCheckoutSession("cs_1")).thenReturn(confirmed);
        when(service.createSubscriptionRenewal(1L)).thenReturn(renewal);

        assertThat(controller.createCheckoutSession(checkout).getBody().getUrl()).isEqualTo("https://checkout");
        assertThat(controller.confirmCheckoutSession("cs_1").getBody()).isSameAs(confirmed);
        assertThat(controller.renewSubscription(1L).getBody()).isSameAs(renewal);
        when(service.createCheckoutSession(checkout)).thenThrow(new IllegalStateException());
        when(service.confirmCheckoutSession("missing")).thenThrow(new NoSuchElementException());
        when(service.createSubscriptionRenewal(2L)).thenThrow(new IllegalArgumentException());
        assertThat(controller.createCheckoutSession(checkout).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.confirmCheckoutSession("missing").getStatusCode().value()).isEqualTo(404);
        assertThat(controller.renewSubscription(2L).getStatusCode().value()).isEqualTo(400);
    }
}
