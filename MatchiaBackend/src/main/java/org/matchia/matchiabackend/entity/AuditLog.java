package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "actor_id")
    private String actorId;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "actor_email")
    private String actorEmail;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(nullable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditCategoryEnum category;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditStatusEnum status;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String diff;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "affected_user_id")
    private String affectedUserId;

    @Column(name = "affected_user_name")
    private String affectedUserName;

    @Column(name = "bank_id")
    private String bankId;

    @Column(name = "marketplace_id")
    private String marketplaceId;

    @Column(name = "email_recipient")
    private String emailRecipient;

    @Column(name = "source")
    private String source;

    @Column(name = "correlation_id")
    private String correlationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
