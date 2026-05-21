package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.ModuleStoreRequest;
import org.matchia.matchiabackend.dto.ModuleStoreResponseDto;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.service.ModuleStoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/modulestores")
@CrossOrigin(origins = "*")
public class ModuleStoreController {

    private final ModuleStoreService moduleStoreService;

    public ModuleStoreController(ModuleStoreService moduleStoreService) {
        this.moduleStoreService = moduleStoreService;
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

        return new ResponseEntity<>(
                moduleStoreService.assignFullModuleToStore(request),
                HttpStatus.CREATED
        );
    }

    // ============ MISE À JOUR ============

    // Toggle module (activer/désactiver) - Pour le toggle du frontend
    @PatchMapping("/store/{storeId}/module/{moduleId}")
    public ResponseEntity<ModuleStoreResponseDto> toggleModule(
            @PathVariable Long storeId,
            @PathVariable Long moduleId,
            @RequestBody Map<String, Boolean> payload) {
        boolean actif = payload.getOrDefault("actif", true);
        return ResponseEntity.ok(moduleStoreService.toggleModule(storeId, moduleId, actif));
    }

    // Mettre à jour l'ordre d'un module
    @PatchMapping("/store/{storeId}/module/{moduleId}/order")
    public ResponseEntity<ModuleStoreResponseDto> updateOrder(
            @PathVariable Long storeId,
            @PathVariable Long moduleId,
            @RequestBody Map<String, Integer> payload) {
        int ordre = payload.getOrDefault("ordre", 0);
        return ResponseEntity.ok(moduleStoreService.updateOrder(storeId, moduleId, ordre));
    }

    // Mettre à jour un module store par ID
    @PutMapping("/{id}")
    public ResponseEntity<ModuleStoreResponseDto> updateModuleStore(
            @PathVariable Long id,
            @RequestBody ModuleStore details) {
        return ResponseEntity.ok(moduleStoreService.updateModuleStore(id, details));
    }

    // ============ SUPPRESSION ============

    // Supprimer une assignation par ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModuleStore(@PathVariable Long id) {
        moduleStoreService.deleteModuleStore(id);
        return ResponseEntity.noContent().build();
    }

    // Supprimer une assignation par storeId et moduleId
    @DeleteMapping("/store/{storeId}/module/{moduleId}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable Long storeId,
            @PathVariable Long moduleId) {
        moduleStoreService.deleteAssignment(storeId, moduleId);
        return ResponseEntity.noContent().build();
    }

    // ============ PARAMÈTRES ============

    // Ajouter un paramètre à un module assigné
    @PostMapping("/{moduleStoreId}/parameters")
    public ResponseEntity<ModuleStoreResponseDto> addParameter(
            @PathVariable Long moduleStoreId,
            @RequestBody ModuleStoreParameter parameter) {
        return ResponseEntity.ok(moduleStoreService.addParameterToModule(moduleStoreId, parameter));
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
        return ResponseEntity.ok(moduleStoreService.updateParameter(parameterId, parameter));
    }

    // Supprimer un paramètre spécifique
    @DeleteMapping("/parameters/{parameterId}")
    public ResponseEntity<ModuleStoreResponseDto> deleteParameter(
            @PathVariable Long parameterId) {
        return ResponseEntity.ok(moduleStoreService.deleteParameter(parameterId));
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