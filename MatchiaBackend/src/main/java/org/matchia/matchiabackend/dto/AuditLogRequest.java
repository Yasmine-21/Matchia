package org.matchia.matchiabackend.dto;

import lombok.Data;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;

@Data
public class AuditLogRequest {
    private String tenantId;
    private String actorId;
    private String actorName;
    private String actorRole;
    private String action;
    private AuditCategoryEnum category;
    private String resourceType;
    private String resourceId;
    private AuditStatusEnum status;
    private String ipAddress;
    private String userAgent;
    private String diff;
    private String metadata;
}
