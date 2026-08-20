package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.AuditLog;
import org.matchia.matchiabackend.mapper.AuditLogMapper;
import org.matchia.matchiabackend.repository.AuditLogRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogAsyncWriterTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AuditLogMapper auditLogMapper;

    @InjectMocks
    private AuditLogAsyncWriter writer;

    @Test
    void write_shouldSaveEntitySuccessfully() {
        AuditLogRequest request = new AuditLogRequest();
        AuditLog entity = new AuditLog();

        when(auditLogMapper.toEntity(request)).thenReturn(entity);

        writer.write(request);

        verify(auditLogRepository).save(entity);
    }

    @Test
    void write_shouldCatchExceptionAndNotThrow() {
        AuditLogRequest request = new AuditLogRequest();
        AuditLog entity = new AuditLog();

        when(auditLogMapper.toEntity(request)).thenReturn(entity);
        doThrow(new RuntimeException("Database error")).when(auditLogRepository).save(any(AuditLog.class));

        writer.write(request); // Should not throw

        verify(auditLogRepository).save(entity);
    }
}
