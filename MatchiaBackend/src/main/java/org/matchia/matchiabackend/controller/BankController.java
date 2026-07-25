package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.BankService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/banks")
@CrossOrigin(origins = "*")
public class BankController {

    private final BankService bankService;
    private final AuditLogger auditLogger;

    public BankController(BankService bankService, AuditLogger auditLogger) {
        this.bankService = bankService;
        this.auditLogger = auditLogger;
    }

    @GetMapping
    public List<BankDto> getBanks() {

        return bankService.getAllBanks();
    }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public BankDto createBank(@RequestBody BankDto bankDto) {

        BankDto created = bankService.createBank(bankDto);
        audit("bank.created", created.getId());
        return created;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BankDto> createBankMultipart(
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            @RequestParam("name") String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "country", required = false) String country,
            @RequestParam(value = "slug", required = false) String slug,
            @RequestParam(value = "websiteUrl", required = false) String websiteUrl,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "establishmentYear", required = false) Integer establishmentYear,
            @RequestParam(value = "status", required = false) BankStatusEnum status
    ) {
        try {
            BankDto created = bankService.createBankMultipart(
                    logo, name, email, phone, country, slug, websiteUrl, description, establishmentYear, status
            );
            audit("bank.created", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public BankDto updateBank(@PathVariable Long id, @RequestBody BankDto bankDto) {
        BankDto updated = bankService.updateBank(id, bankDto);
        audit("bank.updated", id);
        return updated;
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BankDto> updateBankMultipart(
            @PathVariable Long id,
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            @RequestParam("name") String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "country", required = false) String country,
            @RequestParam(value = "slug", required = false) String slug,
            @RequestParam(value = "websiteUrl", required = false) String websiteUrl,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "establishmentYear", required = false) Integer establishmentYear,
            @RequestParam(value = "status", required = false) BankStatusEnum status
    ) {
        try {
            BankDto updated = bankService.updateBankMultipart(
                    id, logo, name, email, phone, country, slug, websiteUrl, description, establishmentYear, status
            );
            audit("bank.updated", id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BankDto> updateBankStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String rawStatus = payload.get("status");

        if (rawStatus == null || rawStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            BankStatusEnum status = BankStatusEnum.valueOf(rawStatus.trim().toLowerCase());
            BankDto updated = bankService.updateStatus(id, status);
            audit("bank.status_updated", id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            // ✅ Ajoute ce log pour voir ce qui arrive exactement
            System.out.println("❌ Status invalide reçu : '" + rawStatus + "'");
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public void deleteBank(@PathVariable Long id) {
        bankService.deleteBank(id);
        audit("bank.deleted", id);
    }

    private void audit(String action, Long bankId) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.data_config);
        audit.setResourceType("bank");
        audit.setResourceId(bankId != null ? String.valueOf(bankId) : null);
        audit.setBankId(bankId != null ? String.valueOf(bankId) : null);
        audit.setStatus(AuditStatusEnum.success);
        audit.setSource("SAAS_BACK_OFFICE");
        auditLogger.logAsync(audit);
    }
}
