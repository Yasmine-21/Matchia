package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.mapper.AuditLogMapper;
import org.matchia.matchiabackend.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
class AuditLogAsyncWriter {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    @Async
    public void write(AuditLogRequest request) {
        try {
            auditLogRepository.save(auditLogMapper.toEntity(request));
        } catch (Exception error) {
            log.warn("Audit log ignored: {}", error.getMessage());
        }
    }
}
