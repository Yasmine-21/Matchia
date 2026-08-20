package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.DealerProduct;
import org.matchia.matchiabackend.entity.FinancingRequest;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.mapper.NotificationMapper;
import org.matchia.matchiabackend.repository.NotificationRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationMapper notificationMapper;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void findAll_success() {
        User admin = new User();
        admin.setId(1L);
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));
        
        Notification notification = new Notification();
        notification.setId(1L);
        when(notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(notification));
        when(notificationMapper.toDto(any())).thenReturn(new NotificationDto());

        List<NotificationDto> result = notificationService.findAll();

        assertThat(result).hasSize(1);
    }

    @Test
    void countUnread_success() {
        User admin = new User();
        admin.setId(1L);
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));
        
        when(notificationRepository.countByRecipientIdIsNullAndStatus(NotificationStatusEnum.UNREAD)).thenReturn(2L);
        when(notificationRepository.countByRecipientIdAndStatus(1L, NotificationStatusEnum.UNREAD)).thenReturn(3L);

        long result = notificationService.countUnread();

        assertThat(result).isEqualTo(5L);
    }

    @Test
    void markAsRead_success() {
        User admin = new User();
        admin.setId(1L);
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));
        
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        
        when(notificationRepository.findByIdAndRecipientId(1L, 1L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any())).thenReturn(notification);
        when(notificationMapper.toDto(any())).thenReturn(new NotificationDto());

        NotificationDto result = notificationService.markAsRead(1L);

        assertThat(result).isNotNull();
        assertThat(notification.getStatus()).isEqualTo(NotificationStatusEnum.READ);
    }

    @Test
    void createRequestCreatedNotification_success() {
        User admin = new User();
        admin.setId(1L);
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));

        Request request = new Request();
        request.setId(10L);
        request.setRequestType(org.matchia.matchiabackend.entity.enums.RequestTypeEnum.join);

        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArguments()[0]);

        Notification result = notificationService.createRequestCreatedNotification(request);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Nouvelle demande d'inscription");
    }

    @Test
    void handlesRecipientBankAndUserReadDeleteAndCounters() {
        Notification notification = new Notification();
        notification.setId(2L);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        NotificationDto dto = new NotificationDto();
        when(notificationRepository.findByIdAndRecipientId(2L, 3L)).thenReturn(Optional.of(notification));
        when(notificationRepository.findBankNotificationById(2L, 4L)).thenReturn(Optional.of(notification));
        when(notificationRepository.findUserNotificationById(2L, 5L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(notificationMapper.toDto(any())).thenReturn(dto);
        when(notificationRepository.countByRecipientIdAndStatus(3L, NotificationStatusEnum.UNREAD)).thenReturn(1L);
        when(notificationRepository.countUnreadBankNotifications(4L, NotificationStatusEnum.UNREAD)).thenReturn(2L);
        when(notificationRepository.countUnreadUserNotifications(5L, NotificationStatusEnum.UNREAD)).thenReturn(3L);

        assertThat(notificationService.countUnreadForRecipient(3L)).isEqualTo(1L);
        assertThat(notificationService.countUnreadForBank(4L)).isEqualTo(2L);
        assertThat(notificationService.countUnreadForUser(5L)).isEqualTo(3L);
        assertThat(notificationService.markAsReadForRecipient(2L, 3L)).isSameAs(dto);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        assertThat(notificationService.markAsReadForBank(2L, 4L)).isSameAs(dto);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        assertThat(notificationService.markAsReadForUser(2L, 5L)).isSameAs(dto);
        notificationService.deleteByIdForRecipient(2L, 3L);
        notificationService.deleteByIdForBank(2L, 4L);
        notificationService.deleteByIdForUser(2L, 5L);
        verify(notificationRepository).deleteById(2L);
        verify(notificationRepository, times(2)).delete(notification);
    }

    @Test
    void createsRequestPaymentAndFinancingNotificationsAcrossRecipientScopes() {
        User admin = new User(); admin.setId(9L);
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        Request request = new Request();
        request.setId(10L); request.setBankName(" Banque "); request.setMarketplaceSlug(" market ");
        request.setRequestType(RequestTypeEnum.store);
        Notification created = notificationService.createRequestCreatedNotification(request);
        Notification approved = notificationService.createRequestApprovedNotification(request);
        Notification rejected = notificationService.createRequestRejectedNotification(request, " documents incomplets ");
        assertThat(created.getMessage()).contains("Banque", "nouveau store");
        assertThat(approved.getTitle()).contains("store");
        assertThat(rejected.getMessage()).contains("Motif", "documents incomplets");

        Payment payment = new Payment(); payment.setId(20L); payment.setRequest(request); payment.setBankName(" Paiement Banque ");
        when(paymentRepository.findById(20L)).thenReturn(Optional.of(payment));
        when(notificationRepository.existsByTypeAndRelatedRequestIdAndRecipientId(any(), any(), any())).thenReturn(false);
        Notification paymentNotice = notificationService.createPaymentSuccessNotification(20L);
        assertThat(paymentNotice.getMessage()).contains("Paiement Banque", "market");

        FinancingRequest financing = new FinancingRequest();
        financing.setId(30L); financing.setClient(admin); financing.setStatus(FinancingRequestStatusEnum.ACCEPTED);
        DealerProduct dealerProduct = new DealerProduct(); dealerProduct.setName("Voiture"); financing.setDealerProduct(dealerProduct);
        when(notificationRepository.findFirstByTypeAndRelatedRequestIdAndRecipientIdAndRecipientScopeOrderByCreatedAtDesc(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        Notification financingNotice = notificationService.createFinancingDecisionNotification(financing);
        assertThat(financingNotice.getRecipientId()).isEqualTo(9L);
        assertThat(financingNotice.getMessage()).contains("Voiture", "accept");

        Bank bank = new Bank(); bank.setId(4L);
        financing.setBank(bank); financing.setReference("FIN-1");
        Product product = new Product(); product.setName("Produit secours"); financing.setProduct(product); financing.setDealerProduct(null);
        Notification bankNotice = notificationService.createBankFinancingRequestSubmittedNotification(financing);
        assertThat(bankNotice.getRecipientScope().name()).isEqualTo("BANK");
        assertThat(bankNotice.getRecipientId()).isEqualTo(4L);
    }

    @Test
    void marksEveryNotificationScopeAsReadInBulk() {
        User admin = new User(); admin.setId(1L);
        Notification notification = new Notification(); notification.setId(1L); notification.setStatus(NotificationStatusEnum.UNREAD);
        NotificationDto dto = new NotificationDto();
        when(userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)).thenReturn(List.of(admin));
        when(notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(anyLong(), eq(NotificationStatusEnum.UNREAD))).thenReturn(List.of(notification));
        when(notificationRepository.findByRecipientIdIsNullAndStatusOrderByCreatedAtDesc(NotificationStatusEnum.UNREAD)).thenReturn(List.of());
        when(notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of(notification));
        when(notificationRepository.findAllByRecipientIdIsNullOrderByCreatedAtDesc()).thenReturn(List.of());
        when(notificationRepository.findUnreadBankNotifications(eq(2L), eq(NotificationStatusEnum.UNREAD))).thenReturn(List.of(notification));
        when(notificationRepository.findAllBankNotifications(2L)).thenReturn(List.of(notification));
        when(notificationRepository.findUnreadUserNotifications(eq(3L), eq(NotificationStatusEnum.UNREAD))).thenReturn(List.of(notification));
        when(notificationRepository.findAllUserNotifications(3L)).thenReturn(List.of(notification));
        when(notificationMapper.toDto(any())).thenReturn(dto);

        assertThat(notificationService.markAllAsRead()).containsExactly(dto);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        assertThat(notificationService.markAllAsReadForRecipient(4L)).containsExactly(dto);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        assertThat(notificationService.markAllAsReadForBank(2L)).containsExactly(dto);
        notification.setStatus(NotificationStatusEnum.UNREAD);
        assertThat(notificationService.markAllAsReadForUser(3L)).containsExactly(dto);
        verify(notificationRepository, times(4)).saveAll(any());
    }
}
