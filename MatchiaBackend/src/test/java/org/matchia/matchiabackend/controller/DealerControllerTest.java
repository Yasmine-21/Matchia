package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.service.*;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DealerControllerTest {
    @Test
    void delegatesDealerQueriesAndNotificationOperations() {
        DealerAccountService accounts = mock(DealerAccountService.class);
        DealerPartnershipService partnerships = mock(DealerPartnershipService.class);
        DealerProductService products = mock(DealerProductService.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        NotificationService notifications = mock(NotificationService.class);
        DealerController controller = new DealerController(accounts, partnerships, products, security, notifications);
        Authentication auth = mock(Authentication.class);
        User user = new User(); user.setId(6L);
        NotificationDto notification = new NotificationDto();
        when(partnerships.availableBanks(auth)).thenReturn(List.of());
        when(partnerships.mine(auth)).thenReturn(List.of());
        when(partnerships.sentByDealer(auth)).thenReturn(List.of());
        when(partnerships.receivedByDealer(auth)).thenReturn(List.of());
        when(partnerships.activeForDealer(auth)).thenReturn(List.of());
        when(products.mine(auth)).thenReturn(List.of());
        when(products.publicationsMine(auth)).thenReturn(List.of());
        when(security.requireDealer(auth)).thenReturn(user);
        when(notifications.findAllForUser(6L)).thenReturn(List.of(notification));
        when(notifications.countUnreadForUser(6L)).thenReturn(2L);
        when(notifications.markAsReadForUser(3L, 6L)).thenReturn(notification);
        when(notifications.markAllAsReadForUser(6L)).thenReturn(List.of(notification));

        assertThat(controller.banks(auth)).isEmpty();
        assertThat(controller.partnerships(auth)).isEmpty();
        assertThat(controller.sentPartnerships(auth)).isEmpty();
        assertThat(controller.receivedPartnerships(auth)).isEmpty();
        assertThat(controller.activePartnerships(auth)).isEmpty();
        assertThat(controller.products(auth)).isEmpty();
        assertThat(controller.publications(auth)).isEmpty();
        assertThat(controller.notifications(auth)).containsExactly(notification);
        assertThat(controller.unreadCount(auth)).containsEntry("count", 2L);
        assertThat(controller.readNotification(auth, 3L)).isSameAs(notification);
        assertThat(controller.readAllNotifications(auth)).containsExactly(notification);
        controller.deleteNotification(auth, 3L);
        verify(notifications).deleteByIdForUser(3L, 6L);
    }
}
