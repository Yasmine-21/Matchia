package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.service.DealerPartnershipService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bank/dealers")
@RequiredArgsConstructor
public class BankDealerController {
    private final DealerPartnershipService partnershipService;
    private final DealerProductService productService;

    @GetMapping("/partnerships") public List<DealerDtos.PartnershipView> partnerships(Authentication auth) { return partnershipService.forBank(auth); }
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
