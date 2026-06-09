package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.StoreStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.StoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/stores")
@CrossOrigin(origins = "*")
public class StoreController {

    private final StoreService storeService;
    private final AuditLogger auditLogger;

    @GetMapping
    public ResponseEntity<List<StoreDto>> getAllStores(
            @RequestParam(value = "status", required = false) StoreStatusEnum status
    ) {
        return ResponseEntity.ok(storeService.getAllStores(status));
    }

    @PostMapping
    public ResponseEntity<StoreDto> addStore(@RequestBody StoreDto storeDto, HttpServletRequest request) {
        try {
            StoreDto created = storeService.createStore(storeDto);
            auditLogger.logAsync(audit("store.created", "store", String.valueOf(created.getId()), AuditStatusEnum.success, request));
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            auditLogger.logAsync(audit("store.created", "store", null, AuditStatusEnum.failure, request));
            return ResponseEntity.badRequest().build();
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<StoreDto> updateStore(@PathVariable Long id, @RequestBody StoreDto storeDto, HttpServletRequest request) {
        try {
            StoreDto updated = storeService.updateStore(id, storeDto);
            auditLogger.logAsync(audit("store.updated", "store", String.valueOf(id), AuditStatusEnum.success, request));
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            auditLogger.logAsync(audit("store.updated", "store", String.valueOf(id), AuditStatusEnum.failure, request));
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStore(@PathVariable Long id, HttpServletRequest request) {
        storeService.deleteStore(id);
        auditLogger.logAsync(audit("store.deleted", "store", String.valueOf(id), AuditStatusEnum.success, request));
        return ResponseEntity.noContent().build();
    }

    private AuditLogRequest audit(String action, String resourceType, String resourceId, AuditStatusEnum status, HttpServletRequest request) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setActorName("Admin");
        audit.setActorRole("SUPER_ADMIN");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.data_config);
        audit.setResourceType(resourceType);
        audit.setResourceId(resourceId);
        audit.setStatus(status);
        audit.setIpAddress(request.getRemoteAddr());
        audit.setUserAgent(request.getHeader("User-Agent"));
        return audit;
    }
}
