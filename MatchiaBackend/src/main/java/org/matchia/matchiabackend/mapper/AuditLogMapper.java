package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.AuditLogDto;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.AuditLog;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLog toEntity(AuditLogRequest request) {
        if (request == null) return null;

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

    public AuditLogDto toDto(AuditLog log) {
        if (log == null) return null;

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
}
