package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.SubscriptionOverviewDto;
import org.matchia.matchiabackend.dto.CreateRenewalRequestDto;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.mapper.RequestMapper;
import org.matchia.matchiabackend.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final RequestMapper requestMapper;

    @GetMapping
    public ResponseEntity<SubscriptionOverviewDto> getSubscriptions() {
        return ResponseEntity.ok(subscriptionService.getOverview());
    }

    @PostMapping("/{subscriptionId}/renewal-requests")
    public ResponseEntity<RequestDto> createRenewalRequest(
            @PathVariable Long subscriptionId,
            @RequestBody CreateRenewalRequestDto payload
    ) {
        try {
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                    .body(requestMapper.toDto(subscriptionService.createRenewalRequest(
                            subscriptionId,
                            payload != null ? payload.getBankId() : null,
                            payload != null ? payload.getCreatedBy() : null
                    )));
        } catch (java.util.NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return ResponseEntity.badRequest().build();
        }
    }
}
