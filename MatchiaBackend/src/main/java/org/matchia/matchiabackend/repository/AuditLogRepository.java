package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.AuditLog;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {
    long countByCategory(AuditCategoryEnum category);
    long countByStatus(AuditStatusEnum status);
}
