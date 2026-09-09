package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.PartnershipContractDtos;
import org.matchia.matchiabackend.service.PartnershipContractService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

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

    @PostMapping("/api/bank/dealers/partnerships/{partnershipId}/contract/revisions")
    public PartnershipContractDtos.View createRevision(Authentication auth, @PathVariable Long partnershipId) {
        return contractService.createRevision(auth, partnershipId);
    }

    @GetMapping("/api/bank/dealers/contracts/{contractId}/preview")
    public PartnershipContractDtos.Preview bankPreview(Authentication auth, @PathVariable Long contractId) {
        return contractService.previewForBank(auth, contractId);
    }

    @GetMapping(value = "/api/bank/dealers/contracts/{contractId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> bankDownload(Authentication auth, @PathVariable Long contractId) {
        PartnershipContractDtos.Preview preview = contractService.previewForBank(auth, contractId);
        return pdf(contractService.documentForBank(auth, contractId), preview.contractNumber());
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

    @GetMapping("/api/dealer/contracts/{contractId}/preview")
    public PartnershipContractDtos.Preview dealerPreview(Authentication auth, @PathVariable Long contractId) {
        return contractService.previewForDealer(auth, contractId);
    }

    @GetMapping(value = "/api/dealer/contracts/{contractId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> dealerDownload(Authentication auth, @PathVariable Long contractId) {
        PartnershipContractDtos.Preview preview = contractService.previewForDealer(auth, contractId);
        return pdf(contractService.documentForDealer(auth, contractId), preview.contractNumber());
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

    private ResponseEntity<byte[]> pdf(byte[] document, String reference) {
        String filename = "Partnership_Contract_" + reference.replaceAll("[^a-zA-Z0-9_-]", "_") + ".pdf";
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").body(document);
    }
}
