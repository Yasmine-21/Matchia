package org.matchia.matchiabackend.service;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.AuditLogDto;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.AuditStatsDto;
import org.matchia.matchiabackend.entity.AuditLog;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogger {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void logAsync(AuditLogRequest request) {
        try {
            auditLogRepository.save(toEntity(request));
        } catch (Exception error) {
            log.warn("Audit log ignored: {}", error.getMessage());
        }
    }

    public AuditLog log(AuditLogRequest request) {
        return auditLogRepository.save(toEntity(request));
    }

    public Page<AuditLogDto> search(
            Pageable pageable,
            AuditCategoryEnum category,
            String action,
            String actorId,
            String resourceType,
            String resourceId,
            AuditStatusEnum status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String search,
            String tenantId
    ) {
        return auditLogRepository.findAll(specification(category, action, actorId, resourceType, resourceId, status, startDate, endDate, search, tenantId), pageable)
                .map(this::toDto);
    }

    public AuditLogDto findById(Long id) {
        return auditLogRepository.findById(id).map(this::toDto).orElse(null);
    }

    public AuditStatsDto stats() {
        long core = auditLogRepository.countByCategory(AuditCategoryEnum.core);
        long security = auditLogRepository.countByCategory(AuditCategoryEnum.security);
        long dataConfig = auditLogRepository.countByCategory(AuditCategoryEnum.data_config);
        long billing = auditLogRepository.countByCategory(AuditCategoryEnum.billing);
        long success = auditLogRepository.countByStatus(AuditStatusEnum.success);
        long failure = auditLogRepository.countByStatus(AuditStatusEnum.failure);
        return new AuditStatsDto(core, security, dataConfig, billing, success, failure, success + failure);
    }

    public String exportCsv(List<AuditLogDto> logs) {
        StringBuilder csv = new StringBuilder("id,createdAt,tenantId,actorName,actorRole,action,category,resourceType,resourceId,status,ipAddress\n");
        for (AuditLogDto log : logs) {
            csv.append(escape(log.getId()))
                    .append(',').append(escape(log.getCreatedAt()))
                    .append(',').append(escape(log.getTenantId()))
                    .append(',').append(escape(log.getActorName()))
                    .append(',').append(escape(log.getActorRole()))
                    .append(',').append(escape(log.getAction()))
                    .append(',').append(escape(log.getCategory()))
                    .append(',').append(escape(log.getResourceType()))
                    .append(',').append(escape(log.getResourceId()))
                    .append(',').append(escape(log.getStatus()))
                    .append(',').append(escape(log.getIpAddress()))
                    .append('\n');
        }
        return csv.toString();
    }

    public Specification<AuditLog> specification(
            AuditCategoryEnum category,
            String action,
            String actorId,
            String resourceType,
            String resourceId,
            AuditStatusEnum status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String search,
            String tenantId
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (category != null) predicates.add(cb.equal(root.get("category"), category));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (hasText(action)) predicates.add(cb.like(cb.lower(root.get("action")), "%" + action.toLowerCase() + "%"));
            if (hasText(actorId)) predicates.add(cb.equal(root.get("actorId"), actorId));
            if (hasText(resourceType)) predicates.add(cb.equal(root.get("resourceType"), resourceType));
            if (hasText(resourceId)) predicates.add(cb.equal(root.get("resourceId"), resourceId));
            if (hasText(tenantId)) predicates.add(cb.equal(root.get("tenantId"), tenantId));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            if (hasText(search)) {
                String value = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("action")), value),
                        cb.like(cb.lower(root.get("actorName")), value),
                        cb.like(cb.lower(root.get("resourceType")), value)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AuditLog toEntity(AuditLogRequest request) {
        AuditLog log = new AuditLog();
        log.setTenantId(defaultText(request.getTenantId(), "saas"));
        log.setActorId(request.getActorId());
        log.setActorName(defaultText(request.getActorName(), "system"));
        log.setActorRole(defaultText(request.getActorRole(), "system"));
        log.setAction(defaultText(request.getAction(), "system.event"));
        log.setCategory(request.getCategory() != null ? request.getCategory() : AuditCategoryEnum.core);
        log.setResourceType(request.getResourceType());
        log.setResourceId(request.getResourceId());
        log.setStatus(request.getStatus() != null ? request.getStatus() : AuditStatusEnum.success);
        log.setIpAddress(request.getIpAddress());
        log.setUserAgent(request.getUserAgent());
        log.setDiff(request.getDiff());
        log.setMetadata(request.getMetadata());
        return log;
    }

    private AuditLogDto toDto(AuditLog log) {
        return new AuditLogDto(
                log.getId(),
                log.getTenantId(),
                log.getActorId(),
                log.getActorName(),
                log.getActorRole(),
                log.getAction(),
                log.getCategory(),
                log.getResourceType(),
                log.getResourceId(),
                log.getStatus(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getDiff(),
                log.getMetadata(),
                log.getCreatedAt()
        );
    }

    private String defaultText(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String escape(Object value) {
        if (value == null) return "";
        return "\"" + String.valueOf(value).replace("\"", "\"\"") + "\"";
    }
}
