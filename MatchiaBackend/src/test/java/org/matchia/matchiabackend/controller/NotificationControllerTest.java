package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.service.NotificationService;

import java.util.List;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class NotificationControllerTest {

    @Test
    void delegatesNotificationReadsAndUpdates() {
        NotificationService service = mock(NotificationService.class);
        NotificationController controller = new NotificationController(service);
        NotificationDto notification = new NotificationDto();
        when(service.findAll()).thenReturn(List.of(notification));
        when(service.findUnread()).thenReturn(List.of(notification));
        when(service.countUnread()).thenReturn(2L);
        when(service.markAsRead(1L)).thenReturn(notification);
        when(service.markAllAsRead()).thenReturn(List.of(notification));

        assertThat(controller.getNotifications().getBody()).containsExactly(notification);
        assertThat(controller.getUnreadNotifications().getBody()).containsExactly(notification);
        assertThat(controller.getUnreadCount().getBody()).containsEntry("count", 2L);
        assertThat(controller.markAsRead(1L).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.markAllAsRead().getBody()).containsExactly(notification);
        assertThat(controller.delete(1L).getStatusCode().value()).isEqualTo(204);
    }

    @Test
    void returnsNotFoundForUnknownNotification() {
        NotificationService service = mock(NotificationService.class);
        NotificationController controller = new NotificationController(service);
        doThrow(new NoSuchElementException()).when(service).deleteById(99L);
        when(service.markAsRead(99L)).thenThrow(new NoSuchElementException());

        assertThat(controller.markAsRead(99L).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.delete(99L).getStatusCode().value()).isEqualTo(404);
    }
}
