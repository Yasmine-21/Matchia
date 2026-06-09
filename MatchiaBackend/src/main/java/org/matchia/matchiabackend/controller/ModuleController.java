package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.ModuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/modules")
@RequiredArgsConstructor
public class ModuleController {
    private final ModuleService moduleService;
    private final AuditLogger auditLogger;

    @GetMapping
    public ResponseEntity<List<ModuleDto>> getAll(
            @RequestParam(value = "status", required = false) ModuleStatusEnum status
    ) {
        return ResponseEntity.ok(moduleService.getAllModules(status));
    }

    @PostMapping
    public ResponseEntity<ModuleDto> create(@RequestBody ModuleDto dto, HttpServletRequest request) {
        ModuleDto created = moduleService.createModule(dto);
        auditLogger.logAsync(audit("module.created", String.valueOf(created.getId()), AuditStatusEnum.success, request));
        return ResponseEntity.ok(created);
    }
    @PutMapping("/{id}")
    public ResponseEntity<ModuleDto> updateModule(@PathVariable Long id, @RequestBody ModuleDto moduleDto, HttpServletRequest request) {
        ModuleDto updated = moduleService.updateModule(id, moduleDto);
        auditLogger.logAsync(audit("module.updated", String.valueOf(id), AuditStatusEnum.success, request));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable Long id, HttpServletRequest request) {
        moduleService.deleteModule(id);
        auditLogger.logAsync(audit("module.deleted", String.valueOf(id), AuditStatusEnum.success, request));
        return ResponseEntity.noContent().build();
    }

    private AuditLogRequest audit(String action, String resourceId, AuditStatusEnum status, HttpServletRequest request) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setActorName("Admin");
        audit.setActorRole("SUPER_ADMIN");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.data_config);
        audit.setResourceType("module");
        audit.setResourceId(resourceId);
        audit.setStatus(status);
        audit.setIpAddress(request.getRemoteAddr());
        audit.setUserAgent(request.getHeader("User-Agent"));
        return audit;
    }
}
