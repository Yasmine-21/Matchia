package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/bank/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class BankNotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(@RequestParam Long recipientId) {
        return ResponseEntity.ok(notificationService.findAllForRecipient(recipientId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam Long recipientId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnreadForRecipient(recipientId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markAsRead(
            @PathVariable Long id,
            @RequestParam Long recipientId
    ) {
        try {
            return ResponseEntity.ok(notificationService.markAsReadForRecipient(id, recipientId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/read-all")
    public ResponseEntity<List<NotificationDto>> markAllAsRead(@RequestParam Long recipientId) {
        return ResponseEntity.ok(notificationService.markAllAsReadForRecipient(recipientId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam Long recipientId
    ) {
        try {
            notificationService.deleteByIdForRecipient(id, recipientId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            log.warn("Notification introuvable pour suppression : {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
