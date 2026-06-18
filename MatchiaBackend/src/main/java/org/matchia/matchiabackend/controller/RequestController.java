package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.RequestRejectionDto;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.mapper.RequestMapper;
import org.matchia.matchiabackend.service.RequestService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/requests", "/api/requests"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class RequestController {

    private final RequestService service;
    private final RequestMapper mapper;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<RequestDto>> getAll() {
        List<RequestDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/bank/{bankId}")
    public ResponseEntity<List<RequestDto>> getByBankId(@PathVariable Long bankId) {
        List<RequestDto> list = service.findByBankId(bankId).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestDto> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(mapper::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequestDto> update(@PathVariable Long id,
                                             @RequestBody RequestDto dto) {
        if (service.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Request entity = mapper.toEntity(dto);
        entity.setId(id);
        return ResponseEntity.ok(mapper.toDto(service.save(entity)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Logique métier ───────────────────────────────────────────────────────

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RequestDto> create(@RequestBody RequestDto dto) {
        try {
            Request entity = service.createJsonRequest(dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(mapper.toDto(entity));
        } catch (IllegalArgumentException e) {
            log.warn("Demande invalide : {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RequestDto> createMultipart(
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            @RequestParam(value = "banniere", required = false) MultipartFile banniere,
            @RequestParam(value = "banniereUrl", required = false) String banniereUrl,
            @RequestParam("bankName") String bankName,
            @RequestParam("bankEmail") String bankEmail,
            @RequestParam("country") String country,
            @RequestParam(value = "website", required = false) String website,
            @RequestParam("contactName") String contactName,
            @RequestParam("contactEmail") String contactEmail,
            @RequestParam("contactPhone") String contactPhone,
            @RequestParam(value = "contactImage", required = false) MultipartFile contactImage,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "bankDescription", required = false) String bankDescription,
            @RequestParam(value = "establishmentYear", required = false) Integer establishmentYear,
            @RequestParam("marketplaceSlug") String marketplaceSlug,
            @RequestParam(value = "marketplaceDescription", required = false) String marketplaceDescription,
            @RequestParam("primaryColor") String primaryColor,
            @RequestParam("secondaryColor") String secondaryColor,
            @RequestParam("selectedStores") String selectedStores,
            @RequestParam(value = "selectedModules", required = false) String selectedModules,
            @RequestParam(value = "totalAmount", required = false) Double totalAmount,
            @RequestParam(value = "totalMonthlyPrice", required = false) Double totalMonthlyPrice
    ) {
        try {
            Request entity = service.createMultipartRequest(
                    bankName, bankEmail, logo, banniere, banniereUrl, country, website,
                    contactName, contactEmail, contactPhone, contactImage,
                    description, bankDescription, establishmentYear,
                    selectedStores, selectedModules != null ? selectedModules : "[]",
                    marketplaceSlug, marketplaceDescription, primaryColor, secondaryColor,
                    totalAmount != null ? totalAmount : totalMonthlyPrice
            );
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(mapper.toDto(entity));
        } catch (IllegalArgumentException e) {
            log.warn("Demande invalide : {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Erreur upload logo : {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<RequestDto> approve(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(mapper.toDto(service.approveRequest(id)));
        } catch (NoSuchElementException e) {
            log.warn("Demande introuvable pour approbation {} : {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Impossible d'approuver la demande {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("Erreur approbation demande {} : {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<RequestDto> reject(
            @PathVariable Long id,
            @RequestBody(required = false) RequestRejectionDto payload
    ) {
        try {
            String rejectionReason = payload != null ? payload.getRejectionReason() : null;
            return ResponseEntity.ok(mapper.toDto(service.rejectRequest(id, rejectionReason)));
        } catch (NoSuchElementException e) {
            log.warn("Demande introuvable pour rejet {} : {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Impossible de rejeter la demande {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("Erreur rejet demande {} : {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<RequestDto> updateStatus(@PathVariable Long id,
                                                   @RequestBody Map<String, String> payload) {
        String rawStatus = payload.get("status");
        if (rawStatus == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            RequestStatusEnum status = RequestStatusEnum.valueOf(rawStatus.trim().toLowerCase());
            return ResponseEntity.ok(mapper.toDto(service.updateStatus(id, status)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Void> confirmPayment(@PathVariable Long id) {
        try {
            var bank = service.validatePaymentAndProvisionBank(id);
            log.info("Banque '{}' provisionnée avec succès.", bank.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erreur provisionnement : {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/logos/{filename:.+}")
    public ResponseEntity<byte[]> getLogo(@PathVariable String filename) {
        try {
            byte[] bytes = service.getLogoFile(filename);
            MediaType mediaType = resolveMediaType(filename);
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(bytes);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ─── Utilitaire ───────────────────────────────────────────────────────────

    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png"))  return MediaType.IMAGE_PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".svg"))  return MediaType.valueOf("image/svg+xml");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
