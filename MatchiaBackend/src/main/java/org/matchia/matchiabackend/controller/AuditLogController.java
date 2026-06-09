package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogDto;
import org.matchia.matchiabackend.dto.AuditStatsDto;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuditLogController {

    private final AuditLogger auditLogger;

    @GetMapping
    public ResponseEntity<Page<AuditLogDto>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) AuditCategoryEnum category,
            @RequestParam(required = false) String action,
            @RequestParam(name = "actor_id", required = false) String actorId,
            @RequestParam(name = "resource_type", required = false) String resourceType,
            @RequestParam(name = "resource_id", required = false) String resourceId,
            @RequestParam(required = false) AuditStatusEnum status,
            @RequestParam(name = "start_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(name = "end_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(name = "tenant_id", required = false) String tenantId,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(limit, 1), Sort.by(sortDirection, sort));
        return ResponseEntity.ok(auditLogger.search(pageable, category, action, actorId, resourceType, resourceId, status, startDate, endDate, search, tenantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AuditLogDto> getLogById(@PathVariable Long id) {
        AuditLogDto log = auditLogger.findById(id);
        return log == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(log);
    }

    @GetMapping("/stats")
    public ResponseEntity<AuditStatsDto> getStats() {
        return ResponseEntity.ok(auditLogger.stats());
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportLogs(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) AuditCategoryEnum category,
            @RequestParam(required = false) String action,
            @RequestParam(name = "actor_id", required = false) String actorId,
            @RequestParam(name = "resource_type", required = false) String resourceType,
            @RequestParam(name = "resource_id", required = false) String resourceId,
            @RequestParam(required = false) AuditStatusEnum status,
            @RequestParam(name = "start_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(name = "end_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(name = "tenant_id", required = false) String tenantId
    ) {
        List<AuditLogDto> logs = auditLogger.search(PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "createdAt")), category, action, actorId, resourceType, resourceId, status, startDate, endDate, search, tenantId)
                .getContent();

        if ("json".equalsIgnoreCase(format)) {
            return ResponseEntity.ok(logs);
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit-logs.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(auditLogger.exportCsv(logs));
    }
}
