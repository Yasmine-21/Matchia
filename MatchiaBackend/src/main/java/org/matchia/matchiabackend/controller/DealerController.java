package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dealer")
@RequiredArgsConstructor
public class DealerController {
    private final DealerAccountService accountService;
    private final DealerPartnershipService partnershipService;
    private final DealerProductService productService;
    private final DealerSecurityService securityService;
    private final NotificationService notificationService;

    @GetMapping("/me") public DealerDtos.DealerView me(Authentication auth) { return accountService.me(auth); }
    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DealerDtos.DealerView updateSettings(
            Authentication auth,
            @Valid @RequestPart("data") DealerDtos.SettingsUpdate input,
            @RequestPart(value = "logo", required = false) MultipartFile logo) {
        return accountService.updateSettings(auth, input, logo);
    }
    @GetMapping("/dashboard") public DealerDtos.Dashboard dashboard(Authentication auth) { return productService.dashboard(auth); }
    @GetMapping("/available-banks") public List<DealerDtos.BankOption> banks(Authentication auth) { return partnershipService.availableBanks(auth); }
    @GetMapping("/partnerships") public List<DealerDtos.PartnershipView> partnerships(Authentication auth) { return partnershipService.mine(auth); }
    @GetMapping("/partnerships/sent") public List<DealerDtos.PartnershipView> sentPartnerships(Authentication auth) { return partnershipService.sentByDealer(auth); }
    @GetMapping("/partnerships/received") public List<DealerDtos.PartnershipView> receivedPartnerships(Authentication auth) { return partnershipService.receivedByDealer(auth); }
    @GetMapping("/partnerships/active") public List<DealerDtos.PartnershipView> activePartnerships(Authentication auth) { return partnershipService.activeForDealer(auth); }
    @PostMapping("/partnerships") @ResponseStatus(HttpStatus.CREATED)
    public DealerDtos.PartnershipView partnership(Authentication auth, @Valid @RequestBody DealerDtos.PartnershipCreate input) {
        return partnershipService.create(auth, input);
    }
    @PostMapping("/partnerships/{id}/approve")
    public DealerDtos.PartnershipView approvePartnership(Authentication auth, @PathVariable Long id) {
        return partnershipService.decideByDealer(auth, id, DealerPartnershipStatusEnum.APPROVED, null);
    }
    @PostMapping("/partnerships/{id}/reject")
    public DealerDtos.PartnershipView rejectPartnership(Authentication auth, @PathVariable Long id,
                                                         @RequestBody DealerDtos.DecisionRequest request) {
        return partnershipService.decideByDealer(auth, id, DealerPartnershipStatusEnum.REJECTED, request.reason());
    }
    @PostMapping("/partnerships/{id}/cancel")
    public DealerDtos.PartnershipView cancelPartnership(Authentication auth, @PathVariable Long id) {
        return partnershipService.cancelByDealer(auth, id);
    }
    @GetMapping("/products") public List<DealerDtos.ProductView> products(Authentication auth) { return productService.mine(auth); }
    @PostMapping(value = "/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED)
    public DealerDtos.ProductView createProduct(Authentication auth, @Valid @RequestPart("data") DealerDtos.ProductUpsert input,
                                                  @RequestPart(value = "image", required = false) MultipartFile image) {
        return productService.create(auth, input, image);
    }
    @PutMapping(value = "/products/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DealerDtos.ProductView updateProduct(Authentication auth, @PathVariable Long id,
                                                  @Valid @RequestPart("data") DealerDtos.ProductUpsert input,
                                                  @RequestPart(value = "image", required = false) MultipartFile image) {
        return productService.update(auth, id, input, image);
    }
    @DeleteMapping("/products/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(Authentication auth, @PathVariable Long id) { productService.delete(auth, id); }
    @GetMapping("/publications") public List<DealerDtos.PublicationView> publications(Authentication auth) { return productService.publicationsMine(auth); }
    @PostMapping("/publications") @ResponseStatus(HttpStatus.CREATED)
    public DealerDtos.PublicationView publish(Authentication auth, @Valid @RequestBody DealerDtos.PublicationCreate input) {
        return productService.submit(auth, input);
    }

    @GetMapping("/notifications")
    public List<NotificationDto> notifications(Authentication auth) {
        User user = securityService.requireDealer(auth);
        return notificationService.findAllForUser(user.getId());
    }

    @GetMapping("/notifications/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        User user = securityService.requireDealer(auth);
        return Map.of("count", notificationService.countUnreadForUser(user.getId()));
    }

    @PatchMapping("/notifications/{id}/read")
    public NotificationDto readNotification(Authentication auth, @PathVariable Long id) {
        User user = securityService.requireDealer(auth);
        return notificationService.markAsReadForUser(id, user.getId());
    }

    @PatchMapping("/notifications/read-all")
    public List<NotificationDto> readAllNotifications(Authentication auth) {
        User user = securityService.requireDealer(auth);
        return notificationService.markAllAsReadForUser(user.getId());
    }

    @DeleteMapping("/notifications/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNotification(Authentication auth, @PathVariable Long id) {
        User user = securityService.requireDealer(auth);
        notificationService.deleteByIdForUser(id, user.getId());
    }
}
