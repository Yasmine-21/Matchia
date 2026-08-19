package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.FinancingRequestDtos;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.service.FinancingRequestService;
import org.matchia.matchiabackend.service.NotificationService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientAreaController {
    private final FinancingRequestService service;
    private final NotificationService notificationService;
    private String email(Authentication authentication) { return authentication.getName(); }

    @GetMapping("/profile") public ClientProfileDto profile(Authentication auth) { return FinancingRequestService.toClientProfile(service.currentClient(email(auth))); }
    @PutMapping("/profile") public ClientProfileDto updateProfile(Authentication auth, @Valid @RequestBody ClientProfileDto dto) { return service.updateClientProfile(email(auth), dto); }
    @GetMapping("/dashboard") public FinancingRequestDtos.DashboardDto dashboard(Authentication auth) { return service.clientDashboard(email(auth)); }
    @GetMapping("/notifications") public List<NotificationDto> notifications(Authentication auth) { service.ensureClientDecisionNotifications(email(auth)); return notificationService.findAllForUser(service.currentClient(email(auth)).getId()); }
    @GetMapping("/notifications/unread-count") public Map<String, Long> unreadNotificationCount(Authentication auth) { return Map.of("count", notificationService.countUnreadForUser(service.currentClient(email(auth)).getId())); }
    @PatchMapping("/notifications/{id}/read") public NotificationDto markNotificationRead(Authentication auth, @PathVariable Long id) { return notificationService.markAsReadForUser(id, service.currentClient(email(auth)).getId()); }
    @PatchMapping("/notifications/read-all") public List<NotificationDto> markAllNotificationsRead(Authentication auth) { return notificationService.markAllAsReadForUser(service.currentClient(email(auth)).getId()); }
    @DeleteMapping("/notifications/{id}") public ResponseEntity<Void> deleteNotification(Authentication auth, @PathVariable Long id) { notificationService.deleteByIdForUser(id, service.currentClient(email(auth)).getId()); return ResponseEntity.noContent().build(); }
    @GetMapping("/financing-requests") public List<FinancingRequestDtos.SummaryDto> list(Authentication auth) { return service.clientRequests(email(auth)); }
    @PostMapping("/financing-requests") public ResponseEntity<FinancingRequestDtos.DetailDto> create(Authentication auth, @Valid @RequestBody FinancingRequestDtos.CreateRequest request) { return ResponseEntity.status(201).body(service.createDraft(email(auth), request)); }
    @GetMapping("/financing-requests/{id}") public FinancingRequestDtos.DetailDto detail(Authentication auth, @PathVariable Long id) { return service.clientRequest(email(auth), id); }
    @PostMapping("/financing-requests/{id}/submit") public FinancingRequestDtos.DetailDto submit(Authentication auth, @PathVariable Long id) { return service.submit(email(auth), id); }
    @GetMapping("/financing-document-requirements") public List<FinancingRequestDtos.DocumentRequirementDto> requirements(Authentication auth, @RequestParam Long storeId) { return service.requirementsForClient(email(auth), storeId); }
    @PostMapping("/financing-requests/{id}/documents/{documentType}") public FinancingRequestDtos.DocumentDto upload(Authentication auth, @PathVariable Long id, @PathVariable String documentType, @RequestParam("file") MultipartFile file) { return service.uploadDocument(email(auth), id, documentType, file); }
    @DeleteMapping("/financing-requests/{id}/documents/{documentId}") public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id, @PathVariable Long documentId) { service.deleteDocument(email(auth), id, documentId); return ResponseEntity.noContent().build(); }
    @GetMapping("/financing-requests/{id}/documents/{documentId}/download") public ResponseEntity<Resource> download(Authentication auth, @PathVariable Long id, @PathVariable Long documentId) { Resource document = service.documentForClient(email(auth), id, documentId); return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFilename() + "\"").body(document); }
}
