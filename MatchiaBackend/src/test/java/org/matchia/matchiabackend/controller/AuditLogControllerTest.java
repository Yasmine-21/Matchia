package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.AuditLogDto;
import org.matchia.matchiabackend.dto.AuditStatsDto;
import org.matchia.matchiabackend.service.AuditLogger;
import org.springframework.data.domain.PageImpl;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuditLogControllerTest {
    @Test
    void searchesReadsStatsAndExportsJsonOrCsv() {
        AuditLogger logger = mock(AuditLogger.class);
        AuditLogController controller = new AuditLogController(logger);
        AuditLogDto log = new AuditLogDto();
        AuditStatsDto stats = new AuditStatsDto();
        when(logger.search(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of(log)));
        when(logger.findById(1L)).thenReturn(log);
        when(logger.stats()).thenReturn(stats);
        when(logger.exportCsv(List.of(log))).thenReturn("header\nvalue");

        assertThat(controller.getLogs(-1, 0, null, null, null, null, null, null, null, null, null, null, "createdAt", "asc").getBody().getContent()).containsExactly(log);
        assertThat(controller.getLogById(1L).getBody()).isSameAs(log);
        assertThat(controller.getStats().getBody()).isSameAs(stats);
        assertThat(controller.exportLogs("json", null, null, null, null, null, null, null, null, null, null).getBody()).isEqualTo(List.of(log));
        assertThat(controller.exportLogs("csv", null, null, null, null, null, null, null, null, null, null).getHeaders().getFirst("Content-Disposition")).contains("audit-logs.csv");
        when(logger.findById(2L)).thenReturn(null);
        assertThat(controller.getLogById(2L).getStatusCode().value()).isEqualTo(404);
    }
}
