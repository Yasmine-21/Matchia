package org.matchia.matchiabackend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.RequestRejectionDto;
import org.matchia.matchiabackend.dto.RequestStoreSelectionDto;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.mapper.RequestMapper;
import org.matchia.matchiabackend.service.RequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class JoinRequestController {

    private final RequestService requestService;
    private final RequestMapper requestMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();;

    @PostMapping(value = "/join-requests", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createJoinRequest(@RequestBody Map<String, Object> payload) {
        try {
            RequestDto dto = toRequestDto(payload);
            Request request = requestService.createJsonRequest(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(requestMapper.toDto(request));
        } catch (IllegalArgumentException e) {
            log.warn("Demande join invalide : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (JsonProcessingException e) {
            log.warn("Payload join invalide : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", "Payload join invalide."));
        } catch (Exception e) {
            log.error("Erreur creation demande join : {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur serveur lors de la creation de la demande."));
        }
    }

    @PostMapping(value = "/join-requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createJoinRequestMultipart(
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
            Request request = requestService.createMultipartRequest(
                    bankName, bankEmail, logo, banniere, banniereUrl, country, website,
                    contactName, contactEmail, contactPhone, contactImage,
                    description, bankDescription, establishmentYear,
                    selectedStores, selectedModules != null ? selectedModules : "[]",
                    marketplaceSlug, marketplaceDescription, primaryColor, secondaryColor,
                    totalAmount != null ? totalAmount : totalMonthlyPrice
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(requestMapper.toDto(request));
        } catch (IllegalArgumentException e) {
            log.warn("Demande join invalide : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            log.error("Erreur upload logo : {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur upload logo."));
        } catch (Exception e) {
            log.error("Erreur creation demande join multipart : {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur serveur lors de la creation de la demande."));
        }
    }

    @GetMapping("/admin/join-requests")
    public ResponseEntity<List<RequestDto>> getAllJoinRequests() {
        return ResponseEntity.ok(requestService.findAll().stream().map(requestMapper::toDto).toList());
    }

    @GetMapping("/admin/join-requests/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(Map.of("count", requestService.countPendingRequests()));
    }

    @GetMapping("/admin/join-requests/{id}")
    public ResponseEntity<RequestDto> getJoinRequestById(@PathVariable Long id) {
        return requestService.findById(id)
                .map(requestMapper::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/admin/join-requests/{id}/status")
    public ResponseEntity<RequestDto> updateJoinRequestStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String rawStatus = payload.get("status");
        if (rawStatus == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            RequestStatusEnum status = RequestStatusEnum.valueOf(rawStatus.trim().toLowerCase());
            return ResponseEntity.ok(requestMapper.toDto(requestService.updateStatus(id, status)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/admin/join-requests/{id}/approve")
    public ResponseEntity<RequestDto> approveJoinRequest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(requestMapper.toDto(requestService.approveRequest(id)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Impossible d'approuver la demande join {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/admin/join-requests/{id}/reject")
    public ResponseEntity<RequestDto> rejectJoinRequest(
            @PathVariable Long id,
            @RequestBody(required = false) RequestRejectionDto payload
    ) {
        try {
            String rejectionReason = payload != null ? payload.getRejectionReason() : null;
            return ResponseEntity.ok(requestMapper.toDto(requestService.rejectRequest(id, rejectionReason)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Impossible de rejeter la demande join {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    private RequestDto toRequestDto(Map<String, Object> payload) throws JsonProcessingException {
        RequestDto dto = new RequestDto();
        dto.setCreatedBy(asString(payload.get("createdBy")));
        dto.setBankName(asString(payload.get("bankName")));
        dto.setBankEmail(asString(payload.get("bankEmail")));
        dto.setCountry(asString(payload.get("country")));
        dto.setWebsite(asString(payload.get("website")));
        dto.setLogoUrl(asString(payload.get("logoUrl")));
        dto.setContactName(asString(payload.get("contactName")));
        dto.setContactEmail(asString(payload.get("contactEmail")));
        dto.setContactPhone(asString(payload.get("contactPhone")));
        dto.setContactImageUrl(asString(payload.get("contactImageUrl")));
        dto.setDescription(asString(payload.get("description")));
        dto.setBankDescription(asString(payload.get("bankDescription")));
        dto.setEstablishmentYear(asInteger(payload.get("establishmentYear")));
        dto.setMarketplaceSlug(asString(payload.get("marketplaceSlug")));
        dto.setMarketplaceDescription(asString(payload.get("marketplaceDescription")));
        dto.setPrimaryColor(asString(payload.get("primaryColor")));
        dto.setSecondaryColor(asString(payload.get("secondaryColor")));
        dto.setBanniereUrl(asString(payload.get("banniereUrl") != null ? payload.get("banniereUrl") : payload.get("bannerImageUrl")));
        dto.setTotalAmount(asDouble(payload.get("totalMonthlyPrice") != null ? payload.get("totalMonthlyPrice") : payload.get("totalAmount")));

        Object selectedStores = payload.get("selectedStores");
        if (selectedStores != null) {
            dto.setSelectedStores(objectMapper.writeValueAsString(selectedStores));
            dto.setSelectedStoreDetails(objectMapper.convertValue(
                    selectedStores,
                    new TypeReference<List<RequestStoreSelectionDto>>() {}
            ));
            dto.setStoreIds(dto.getSelectedStoreDetails().stream()
                    .map(RequestStoreSelectionDto::getStoreId)
                    .filter(Objects::nonNull)
                    .toList());
            dto.setModuleIds(dto.getSelectedStoreDetails().stream()
                    .flatMap(store -> store.getModules() == null ? java.util.stream.Stream.<org.matchia.matchiabackend.dto.RequestModuleSelectionDto>empty() : store.getModules().stream())
                    .map(module -> module.getModuleId())
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList());
        }

        return dto;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Double asDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.doubleValue();
        return Double.valueOf(String.valueOf(value));
    }

    private Integer asInteger(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        if (value instanceof Number number) return number.intValue();
        return Integer.valueOf(String.valueOf(value));
    }
}
