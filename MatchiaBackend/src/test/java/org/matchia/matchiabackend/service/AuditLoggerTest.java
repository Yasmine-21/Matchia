package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuditLogDto;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.AuditStatsDto;
import org.matchia.matchiabackend.entity.AuditLog;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.mapper.AuditLogMapper;
import org.matchia.matchiabackend.repository.AuditLogRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLoggerTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    
    @Mock
    private AuditLogMapper auditLogMapper;
    
    @Mock
    private AuditActorResolver auditActorResolver;
    
    @Mock
    private AuditLogAsyncWriter auditLogAsyncWriter;

    @InjectMocks
    private AuditLogger auditLogger;

    @Test
    void logAsync_shouldResolveAndWriteAsync() {
        AuditLogRequest request = new AuditLogRequest();
        AuditLogRequest resolvedRequest = new AuditLogRequest();
        
        when(auditActorResolver.resolve(request)).thenReturn(resolvedRequest);
        
        auditLogger.logAsync(request);
        
        verify(auditLogAsyncWriter).write(resolvedRequest);
    }
    
    @Test
    void logSystemAsync_shouldResolveSystemAndWriteAsync() {
        AuditLogRequest request = new AuditLogRequest();
        AuditLogRequest resolvedRequest = new AuditLogRequest();
        
        when(auditActorResolver.systemEvent(request, "CUSTOM_SOURCE")).thenReturn(resolvedRequest);
        
        auditLogger.logSystemAsync(request, "CUSTOM_SOURCE");
        
        verify(auditLogAsyncWriter).write(resolvedRequest);
    }
    
    @Test
    void log_shouldResolveMapAndSave() {
        AuditLogRequest request = new AuditLogRequest();
        AuditLogRequest resolvedRequest = new AuditLogRequest();
        AuditLog entity = new AuditLog();
        AuditLog savedEntity = new AuditLog();
        
        when(auditActorResolver.resolve(request)).thenReturn(resolvedRequest);
        when(auditLogMapper.toEntity(resolvedRequest)).thenReturn(entity);
        when(auditLogRepository.save(entity)).thenReturn(savedEntity);
        
        AuditLog result = auditLogger.log(request);
        
        assertEquals(savedEntity, result);
        verify(auditLogRepository).save(entity);
    }

    @Test
    void search_shouldCallRepositoryAndMap() {
        PageRequest pageRequest = PageRequest.of(0, 10);
        AuditLog entity = new AuditLog();
        Page<AuditLog> page = new PageImpl<>(List.of(entity));
        AuditLogDto dto = new AuditLogDto();
        
        when(auditLogRepository.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(page);
        when(auditLogMapper.toDto(entity)).thenReturn(dto);
        
        Page<AuditLogDto> result = auditLogger.search(
                pageRequest, AuditCategoryEnum.core, "action", "actor123", "resourceType", 
                "resource123", AuditStatusEnum.success, LocalDateTime.now(), LocalDateTime.now(), 
                "search term", "tenant1"
        );
        
        assertEquals(1, result.getTotalElements());
        assertEquals(dto, result.getContent().get(0));
    }
    
    @Test
    void findById_shouldReturnDto_whenFound() {
        AuditLog entity = new AuditLog();
        AuditLogDto dto = new AuditLogDto();
        
        when(auditLogRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(auditLogMapper.toDto(entity)).thenReturn(dto);
        
        AuditLogDto result = auditLogger.findById(1L);
        
        assertEquals(dto, result);
    }
    
    @Test
    void findById_shouldReturnNull_whenNotFound() {
        when(auditLogRepository.findById(1L)).thenReturn(Optional.empty());
        
        AuditLogDto result = auditLogger.findById(1L);
        
        assertNull(result);
    }

    @Test
    void stats_shouldReturnCorrectStats() {
        when(auditLogRepository.countByCategory(AuditCategoryEnum.core)).thenReturn(10L);
        when(auditLogRepository.countByCategory(AuditCategoryEnum.security)).thenReturn(20L);
        when(auditLogRepository.countByCategory(AuditCategoryEnum.data_config)).thenReturn(30L);
        when(auditLogRepository.countByCategory(AuditCategoryEnum.billing)).thenReturn(40L);
        when(auditLogRepository.countByStatus(AuditStatusEnum.success)).thenReturn(80L);
        when(auditLogRepository.countByStatus(AuditStatusEnum.failure)).thenReturn(20L);
        
        AuditStatsDto result = auditLogger.stats();
        
        assertEquals(10L, result.getCore());
        assertEquals(20L, result.getSecurity());
        assertEquals(30L, result.getDataConfig());
        assertEquals(40L, result.getBilling());
        assertEquals(80L, result.getSuccess());
        assertEquals(20L, result.getFailure());
        assertEquals(100L, result.getTotal());
    }
    
    @Test
    void exportCsv_shouldFormatProperly() {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(1L);
        dto.setActorName("John \"Doe\""); // Testing escaping
        
        String csv = auditLogger.exportCsv(List.of(dto));
        
        assertTrue(csv.contains("id,createdAt,tenantId"));
        assertTrue(csv.contains("\"1\""));
        assertTrue(csv.contains("\"John \"\"Doe\"\"\""));
    }
    
    @Test
    void specification_shouldCreateValidSpec() {
        Specification<AuditLog> spec = auditLogger.specification(
                AuditCategoryEnum.core, "action", "actor123", "resourceType", 
                "resource123", AuditStatusEnum.success, LocalDateTime.now(), LocalDateTime.now(), 
                "search term", "tenant1"
        );
        assertNotNull(spec);
    }
}
