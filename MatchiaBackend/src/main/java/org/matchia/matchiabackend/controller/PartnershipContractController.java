package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.PartnershipContractDtos;
import org.matchia.matchiabackend.service.PartnershipContractService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PartnershipContractController {
    private final PartnershipContractService contractService;

    @GetMapping("/api/bank/dealers/contracts")
    public List<PartnershipContractDtos.View> bankContracts(Authentication auth) {
        return contractService.forBank(auth);
    }

    @GetMapping("/api/bank/dealers/partnerships/{partnershipId}/contract")
    public PartnershipContractDtos.View bankContract(Authentication auth, @PathVariable Long partnershipId) {
        return contractService.forBankPartnership(auth, partnershipId);
    }

    @PostMapping("/api/bank/dealers/partnerships/{partnershipId}/contract")
    public PartnershipContractDtos.View createOrPrepare(Authentication auth, @PathVariable Long partnershipId,
                                                         @Valid @RequestBody PartnershipContractDtos.UpsertRequest input) {
        return contractService.prepare(auth, partnershipId, input);
    }

    @PutMapping("/api/bank/dealers/partnerships/{partnershipId}/contract")
    public PartnershipContractDtos.View update(Authentication auth, @PathVariable Long partnershipId,
                                                @Valid @RequestBody PartnershipContractDtos.UpsertRequest input) {
        return contractService.prepare(auth, partnershipId, input);
    }

    @PostMapping("/api/bank/dealers/contracts/{contractId}/send")
    public PartnershipContractDtos.View send(Authentication auth, @PathVariable Long contractId) {
        return contractService.send(auth, contractId);
    }

    @PostMapping("/api/bank/dealers/contracts/{contractId}/activate")
    public PartnershipContractDtos.View activate(Authentication auth, @PathVariable Long contractId) {
        return contractService.activate(auth, contractId);
    }

    @PostMapping("/api/bank/dealers/contracts/{contractId}/terminate")
    public PartnershipContractDtos.View terminate(Authentication auth, @PathVariable Long contractId,
                                                   @Valid @RequestBody PartnershipContractDtos.RejectionRequest input) {
        return contractService.terminate(auth, contractId, input.reason());
    }

    @GetMapping("/api/dealer/contracts")
    public List<PartnershipContractDtos.View> dealerContracts(Authentication auth) {
        return contractService.forDealer(auth);
    }

    @GetMapping("/api/dealer/contracts/{contractId}")
    public PartnershipContractDtos.View dealerContract(Authentication auth, @PathVariable Long contractId) {
        return contractService.forDealer(auth, contractId);
    }

    @PostMapping("/api/dealer/contracts/{contractId}/accept")
    public PartnershipContractDtos.View accept(Authentication auth, @PathVariable Long contractId) {
        return contractService.acceptByDealer(auth, contractId);
    }

    @PostMapping("/api/dealer/contracts/{contractId}/reject")
    public PartnershipContractDtos.View reject(Authentication auth, @PathVariable Long contractId,
                                                @Valid @RequestBody PartnershipContractDtos.RejectionRequest input) {
        return contractService.rejectByDealer(auth, contractId, input.reason());
    }

    @GetMapping("/api/saas/dealers/contracts")
    public List<PartnershipContractDtos.View> supervise(Authentication auth) {
        return contractService.supervise(auth);
    }
}
