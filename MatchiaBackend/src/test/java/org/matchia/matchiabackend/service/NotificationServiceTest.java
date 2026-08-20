package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
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
}
