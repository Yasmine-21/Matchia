package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
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

    public BankController(BankService bankService) {

        this.bankService = bankService;
    }

    @GetMapping
    public List<BankDto> getBanks() {

        return bankService.getAllBanks();
    }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public BankDto createBank(@RequestBody BankDto bankDto) {

        return bankService.createBank(bankDto);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BankDto> createBankMultipart(
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            @RequestParam("name") String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "country", required = false) String country,
            @RequestParam(value = "slug", required = false) String slug,
            @RequestParam(value = "websiteUrl", required = false) String websiteUrl,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "establishmentYear", required = false) Integer establishmentYear,
            @RequestParam(value = "status", required = false) BankStatusEnum status
    ) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(bankService.createBankMultipart(
                    logo, name, email, country, slug, websiteUrl, description, establishmentYear, status
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public BankDto updateBank(@PathVariable Long id, @RequestBody BankDto bankDto) {
        return bankService.updateBank(id, bankDto);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BankDto> updateBankMultipart(
            @PathVariable Long id,
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            @RequestParam("name") String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "country", required = false) String country,
            @RequestParam(value = "slug", required = false) String slug,
            @RequestParam(value = "websiteUrl", required = false) String websiteUrl,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "establishmentYear", required = false) Integer establishmentYear,
            @RequestParam(value = "status", required = false) BankStatusEnum status
    ) {
        try {
            return ResponseEntity.ok(bankService.updateBankMultipart(
                    id, logo, name, email, country, slug, websiteUrl, description, establishmentYear, status
            ));
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
            return ResponseEntity.ok(bankService.updateStatus(id, status));
        } catch (IllegalArgumentException e) {
            // ✅ Ajoute ce log pour voir ce qui arrive exactement
            System.out.println("❌ Status invalide reçu : '" + rawStatus + "'");
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public void deleteBank(@PathVariable Long id) {
        bankService.deleteBank(id);
    }
}
