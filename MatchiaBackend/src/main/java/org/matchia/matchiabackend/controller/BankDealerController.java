package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.service.DealerPartnershipService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bank/dealers")
@RequiredArgsConstructor
public class BankDealerController {
    private final DealerPartnershipService partnershipService;
    private final DealerProductService productService;

    @GetMapping("/available")
    public List<DealerDtos.DealerView> availableDealers(Authentication auth,
                                                        @RequestParam(required = false) Long storeId) {
        return partnershipService.availableDealers(auth, storeId);
    }
    @GetMapping("/stores")
    public List<DealerDtos.StoreOption> availableStores(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug) {
        return partnershipService.availableStoresForBank(auth, bankSlug);
    }
    @GetMapping("/stores/{storeId}/dealers")
    public List<DealerDtos.DealerView> dealersByStore(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug,
            @PathVariable Long storeId) {
        return partnershipService.dealersByStore(auth, bankSlug, storeId);
    }
    @GetMapping("/partnerships")
    public List<DealerDtos.PartnershipView> partnerships(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug) {
        return partnershipService.forBank(auth, bankSlug);
    }
    @GetMapping("/partnerships/sent")
    public List<DealerDtos.PartnershipView> sent(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug) {
        return partnershipService.sentByBank(auth, bankSlug);
    }
    @GetMapping("/partnerships/received")
    public List<DealerDtos.PartnershipView> received(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug) {
        return partnershipService.receivedByBank(auth, bankSlug);
    }
    @GetMapping("/partnerships/active")
    public List<DealerDtos.PartnershipView> active(Authentication auth,
            @RequestHeader(value = "X-Bank-Slug", required = false) String bankSlug) {
        return partnershipService.activeForBank(auth, bankSlug);
    }
    @PostMapping("/partnerships") @ResponseStatus(HttpStatus.CREATED)
    public DealerDtos.PartnershipView invite(Authentication auth, @Valid @RequestBody DealerDtos.BankPartnershipCreate input) {
        return partnershipService.createByBank(auth, input);
    }
    @PostMapping("/partnerships/{id}/approve")
    public DealerDtos.PartnershipView approve(Authentication auth, @PathVariable Long id) {
        return partnershipService.decide(auth, id, DealerPartnershipStatusEnum.APPROVED, null);
    }
    @PostMapping("/partnerships/{id}/reject")
    public DealerDtos.PartnershipView reject(Authentication auth, @PathVariable Long id,
                                               @RequestBody DealerDtos.DecisionRequest request) {
        return partnershipService.decide(auth, id, DealerPartnershipStatusEnum.REJECTED, request.reason());
    }
    @PostMapping("/partnerships/{id}/cancel")
    public DealerDtos.PartnershipView cancel(Authentication auth, @PathVariable Long id) {
        return partnershipService.cancelByBank(auth, id);
    }
    @PutMapping("/partnerships/{id}/{status}")
    public DealerDtos.PartnershipView decidePartnership(Authentication auth, @PathVariable Long id,
            @PathVariable DealerPartnershipStatusEnum status, @RequestBody(required = false) DealerDtos.DecisionRequest request) {
        return partnershipService.decide(auth, id, status, request == null ? null : request.reason());
    }
    @GetMapping("/publications") public List<DealerDtos.PublicationView> publications(Authentication auth) { return productService.publicationsForBank(auth); }
    @PutMapping("/publications/{id}/{status}")
    public DealerDtos.PublicationView decidePublication(Authentication auth, @PathVariable Long id,
            @PathVariable ProductPublicationStatusEnum status, @RequestBody(required = false) DealerDtos.DecisionRequest request) {
        return productService.decide(auth, id, status, request == null ? null : request.reason());
    }
}
