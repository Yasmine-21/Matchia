package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.service.FinancingRequestService;
import org.matchia.matchiabackend.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class BankNotificationControllerTest {
    @Test
    void delegatesBankNotificationsAndProtectsRecipientScope() {
        NotificationService notifications = mock(NotificationService.class);
        FinancingRequestService financing = mock(FinancingRequestService.class);
        BankNotificationController controller = new BankNotificationController(notifications, financing);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("bank@example.com");
        Bank bank = new Bank(); bank.setId(5L);
        User admin = new User(); admin.setBank(bank);
        NotificationDto notification = new NotificationDto();
        when(financing.currentBankAdmin("bank@example.com")).thenReturn(admin);
        when(notifications.findAllForBank(5L)).thenReturn(List.of(notification));
        when(notifications.countUnreadForBank(5L)).thenReturn(2L);
        when(notifications.markAsReadForBank(1L, 5L)).thenReturn(notification);
        when(notifications.markAllAsReadForBank(5L)).thenReturn(List.of(notification));

        assertThat(controller.getNotifications(5L, auth).getBody()).containsExactly(notification);
        assertThat(controller.getUnreadCount(5L, auth).getBody()).containsEntry("count", 2L);
        assertThat(controller.markAsRead(1L, 5L, auth).getBody()).isSameAs(notification);
        assertThat(controller.markAllAsRead(5L, auth).getBody()).containsExactly(notification);
        assertThat(controller.delete(1L, 5L, auth).getStatusCode().value()).isEqualTo(204);
        assertThatThrownBy(() -> controller.getNotifications(6L, auth)).isInstanceOf(ResponseStatusException.class);
        when(notifications.markAsReadForBank(2L, 5L)).thenThrow(new NoSuchElementException());
        assertThat(controller.markAsRead(2L, 5L, auth).getStatusCode().value()).isEqualTo(404);
    }
}
