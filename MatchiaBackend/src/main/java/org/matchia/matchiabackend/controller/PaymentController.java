package org.matchia.matchiabackend.controller;

import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.CheckoutSessionRequest;
import org.matchia.matchiabackend.dto.CheckoutSessionResponse;
import org.matchia.matchiabackend.dto.ConfirmPaymentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentRequest;
import org.matchia.matchiabackend.dto.CreatePaymentIntentResponse;
import org.matchia.matchiabackend.dto.PaymentConfigResponse;
import org.matchia.matchiabackend.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/config")
    public ResponseEntity<PaymentConfigResponse> getPaymentConfig() {
        try {
            return ResponseEntity.ok(new PaymentConfigResponse(paymentService.getPublishableKey()));
        } catch (IllegalStateException e) {
            log.warn("Payment configuration is incomplete: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(@RequestBody CreatePaymentIntentRequest request) {
        try {
            return ResponseEntity.ok(paymentService.createPaymentIntent(request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Invalid payment intent request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (NoSuchElementException e) {
            log.warn("Payment intent request target not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (StripeException e) {
            log.error("Stripe payment intent creation failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @PostMapping("/{paymentId}/confirm")
    public ResponseEntity<CreatePaymentIntentResponse> confirmPayment(
            @PathVariable Long paymentId,
            @RequestBody ConfirmPaymentRequest request
    ) {
        try {
            return ResponseEntity.ok(paymentService.confirmPayment(paymentId, request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Invalid payment confirmation request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (NoSuchElementException e) {
            log.warn("Payment confirmation target not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (StripeException e) {
            log.error("Stripe payment confirmation lookup failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(@RequestBody CheckoutSessionRequest request) {
        try {
            String url = paymentService.createCheckoutSession(request);
            return ResponseEntity.ok(new CheckoutSessionResponse(url));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Invalid checkout session request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (NoSuchElementException e) {
            log.warn("Checkout session request target not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (StripeException e) {
            log.error("Stripe checkout session creation failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @GetMapping("/paid-subscriptions")
    public ResponseEntity<java.util.List<org.matchia.matchiabackend.dto.PaidSubscriptionDto>> getPaidSubscriptions() {
        return ResponseEntity.ok(paymentService.getPaidSubscriptions());
    }
}
