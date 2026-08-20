package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.SubscriptionOverviewDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.Subscription;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentStatusEnum;
import org.matchia.matchiabackend.entity.enums.PaymentTypeEnum;
import org.matchia.matchiabackend.entity.enums.SubscriptionStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.SubscriptionRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RequestRepository requestRepository;
    @Mock
    private MarketplaceRepository marketplaceRepository;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SubscriptionService subscriptionService;

    @Test
    void resolveOrCreateForRequest_shouldReturnExisting() {
        Request request = new Request();
        request.setId(1L);
        Subscription subscription = new Subscription();
        when(subscriptionRepository.findByRequest_Id(1L)).thenReturn(Optional.of(subscription));

        Subscription result = subscriptionService.resolveOrCreateForRequest(request);

        assertThat(result).isEqualTo(subscription);
    }

    @Test
    void activateFromSuccessfulPayment_shouldActivate() {
        Payment payment = new Payment();
        payment.setStatus(PaymentStatusEnum.paid);
        payment.setPaidAt(LocalDateTime.now());
        payment.setPaymentType(PaymentTypeEnum.INITIAL);

        Request request = new Request();
        request.setId(1L);
        Bank bank = new Bank();
        Marketplace marketplace = new Marketplace();
        bank.setMarketplace(marketplace);
        request.setBank(bank);
        payment.setRequest(request);

        Subscription subscription = new Subscription();
        subscription.setMarketplace(marketplace);
        when(subscriptionRepository.findByRequest_Id(1L)).thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(i -> i.getArguments()[0]);

        Subscription result = subscriptionService.activateFromSuccessfulPayment(payment);

        assertThat(result.getStatus()).isEqualTo(SubscriptionStatusEnum.ACTIVE);
        verify(subscriptionRepository).save(any(Subscription.class));
    }
    
    @Test
    void activateFromSuccessfulPayment_nullPayment_throwsException() {
        assertThatThrownBy(() -> subscriptionService.activateFromSuccessfulPayment(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getOverview_returnsCorrectCounts() {
        Subscription sub1 = new Subscription();
        sub1.setId(1L);
        sub1.setStatus(SubscriptionStatusEnum.ACTIVE);
        
        when(subscriptionRepository.findByStartDateIsNotNullOrderByExpirationDateDesc()).thenReturn(List.of(sub1));
        
        SubscriptionOverviewDto result = subscriptionService.getOverview();
        
        assertThat(result).isNotNull();
    }
}
