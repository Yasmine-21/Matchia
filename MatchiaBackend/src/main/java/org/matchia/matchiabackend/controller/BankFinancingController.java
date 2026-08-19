package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.FinancingRequestDtos;
import org.matchia.matchiabackend.service.FinancingRequestService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bank")
@RequiredArgsConstructor
public class BankFinancingController {
    private final FinancingRequestService service;
    private String email(Authentication authentication) { return authentication.getName(); }
    @GetMapping("/clients") public List<ClientProfileDto> clients(Authentication auth) { return service.bankClients(email(auth)); }
    @GetMapping("/clients/{id}") public ClientProfileDto client(Authentication auth, @PathVariable Long id) { return service.bankClient(email(auth), id); }
    @GetMapping("/clients/{id}/financing-requests") public List<FinancingRequestDtos.SummaryDto> clientRequests(Authentication auth, @PathVariable Long id) { return service.bankClientRequests(email(auth), id); }
    @GetMapping("/financing-requests") public List<FinancingRequestDtos.SummaryDto> requests(Authentication auth, @RequestParam Long storeId, @RequestParam(required = false) String status, @RequestParam(required = false) String search) { return service.bankRequests(email(auth), storeId, status, search); }
    @GetMapping("/financing-requests/{id}") public FinancingRequestDtos.DetailDto request(Authentication auth, @PathVariable Long id) { return service.bankRequest(email(auth), id); }
    @PostMapping("/financing-requests/{id}/process") public FinancingRequestDtos.DetailDto process(Authentication auth, @PathVariable Long id, @Valid @RequestBody FinancingRequestDtos.ProcessRequest request) { return service.process(email(auth), id, request); }
    @GetMapping("/financing-requests/{id}/documents/{documentId}/download") public ResponseEntity<Resource> download(Authentication auth, @PathVariable Long id, @PathVariable Long documentId) { Resource document = service.documentForBank(email(auth), id, documentId); return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFilename() + "\"").body(document); }
}
