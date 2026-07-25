package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.ModuleStoreRequest;
import org.matchia.matchiabackend.dto.ModuleStoreResponseDto;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.ModuleStoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/modulestores")
@CrossOrigin(origins = "*")
public class ModuleStoreController {

    private final ModuleStoreService moduleStoreService;
    private final AuditLogger auditLogger;

    public ModuleStoreController(ModuleStoreService moduleStoreService, AuditLogger auditLogger) {
        this.moduleStoreService = moduleStoreService;
        this.auditLogger = auditLogger;
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<ModuleStoreResponseDto>> getModulesByStore(@PathVariable Long storeId) {
        return ResponseEntity.ok(moduleStoreService.getModulesByStore(storeId));
    }


    @GetMapping("/store/{storeId}/active")
    public ResponseEntity<List<ModuleStoreResponseDto>> getActiveModulesByStore(@PathVariable Long storeId) {
        return ResponseEntity.ok(moduleStoreService.getActiveModulesByStore(storeId));
    }


    @GetMapping("/store/{storeId}/module/{moduleId}")
    public ResponseEntity<ModuleStoreResponseDto> getAssignment(
            @PathVariable Long storeId,
            @PathVariable Long moduleId) {
        return ResponseEntity.ok(moduleStoreService.getAssignment(storeId, moduleId));
    }

    // ============ CRÉATION / ASSIGNATION ============

    @PostMapping("/assign-full")
    public ResponseEntity<ModuleStoreResponseDto> assignFull(@RequestBody ModuleStoreRequest request) {

        try {
            ModuleStoreResponseDto assignment = moduleStoreService.assignFullModuleToStore(request);
            audit("module_store.assigned", assignment.getId());
            return new ResponseEntity<>(assignment, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ============ MISE À JOUR ============

    // Toggle module (activer/désactiver) - Pour le toggle du frontend
    @PatchMapping("/store/{storeId}/module/{moduleId}")
    public ResponseEntity<ModuleStoreResponseDto> toggleModule(
            @PathVariable Long storeId,
            @PathVariable Long moduleId,
            @RequestBody Map<String, Boolean> payload) {
        boolean actif = payload.getOrDefault("actif", true);
        try {
            ModuleStoreResponseDto assignment = moduleStoreService.toggleModule(storeId, moduleId, actif);
            audit("module_store.activation_updated", assignment.getId());
            return ResponseEntity.ok(assignment);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Mettre à jour l'ordre d'un module
    @PatchMapping("/store/{storeId}/module/{moduleId}/order")
    public ResponseEntity<ModuleStoreResponseDto> updateOrder(
            @PathVariable Long storeId,
            @PathVariable Long moduleId,
            @RequestBody Map<String, Integer> payload) {
        int ordre = payload.getOrDefault("ordre", 0);
        ModuleStoreResponseDto assignment = moduleStoreService.updateOrder(storeId, moduleId, ordre);
        audit("module_store.order_updated", assignment.getId());
        return ResponseEntity.ok(assignment);
    }

    // Mettre à jour un module store par ID
    @PutMapping("/{id}")
    public ResponseEntity<ModuleStoreResponseDto> updateModuleStore(
            @PathVariable Long id,
            @RequestBody ModuleStore details) {
        try {
            ModuleStoreResponseDto assignment = moduleStoreService.updateModuleStore(id, details);
            audit("module_store.updated", id);
            return ResponseEntity.ok(assignment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{moduleStoreId}/price")
    public ResponseEntity<ModuleStoreResponseDto> updateModuleStorePrice(
            @PathVariable Long moduleStoreId,
            @RequestBody Map<String, BigDecimal> payload) {
        try {
            ModuleStoreResponseDto assignment = moduleStoreService.updateModuleStorePrice(moduleStoreId, payload.get("price"));
            audit("module_store.price_updated", moduleStoreId);
            return ResponseEntity.ok(assignment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ============ SUPPRESSION ============

    // Supprimer une assignation par ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModuleStore(@PathVariable Long id) {
        moduleStoreService.deleteModuleStore(id);
        audit("module_store.deleted", id);
        return ResponseEntity.noContent().build();
    }

    // Supprimer une assignation par storeId et moduleId
    @DeleteMapping("/store/{storeId}/module/{moduleId}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable Long storeId,
            @PathVariable Long moduleId) {
        moduleStoreService.deleteAssignment(storeId, moduleId);
        audit("module_store.deleted", storeId + ":" + moduleId);
        return ResponseEntity.noContent().build();
    }

    // ============ PARAMÈTRES ============

    // Ajouter un paramètre à un module assigné
    @PostMapping("/{moduleStoreId}/parameters")
    public ResponseEntity<ModuleStoreResponseDto> addParameter(
            @PathVariable Long moduleStoreId,
            @RequestBody ModuleStoreParameter parameter) {
        try {
            return ResponseEntity.ok(moduleStoreService.addParameterToModule(moduleStoreId, parameter));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Récupérer les paramètres d'un module assigné
    @GetMapping("/{moduleStoreId}/parameters")
    public ResponseEntity<List<ModuleStoreParameter>> getParameters(@PathVariable Long moduleStoreId) {
        return ResponseEntity.ok(moduleStoreService.getParameters(moduleStoreId));
    }

    // Modifier un paramètre spécifique
    @PutMapping("/parameters/{parameterId}")
    public ResponseEntity<ModuleStoreResponseDto> updateParameter(
            @PathVariable Long parameterId,
            @RequestBody ModuleStoreParameter parameter) {
        try {
            return ResponseEntity.ok(moduleStoreService.updateParameter(parameterId, parameter));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Supprimer un paramètre spécifique
    @DeleteMapping("/parameters/{parameterId}")
    public ResponseEntity<ModuleStoreResponseDto> deleteParameter(
            @PathVariable Long parameterId) {
        try {
            return ResponseEntity.ok(moduleStoreService.deleteParameter(parameterId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private void audit(String action, Object resourceId) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.data_config);
        audit.setResourceType("module_store");
        audit.setResourceId(resourceId != null ? String.valueOf(resourceId) : null);
        audit.setStatus(AuditStatusEnum.success);
        audit.setSource("SAAS_BACK_OFFICE");
        auditLogger.logAsync(audit);
    }


    // ============ UTILITAIRES ============

    // Vérifier si un module est assigné à un store


    // Compter le nombre de modules assignés à un store
    @GetMapping("/store/{storeId}/count")
    public ResponseEntity<Map<String, Long>> countModules(@PathVariable Long storeId) {
        long count = moduleStoreService.countModulesByStore(storeId);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
