package org.matchia.matchiabackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.ModuleService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ModuleControllerTest {

    @Test
    void readsAndMutatesModulesWithAudit() {
        ModuleService service = mock(ModuleService.class);
        AuditLogger audit = mock(AuditLogger.class);
        ModuleController controller = new ModuleController(service, audit);
        ModuleDto dto = new ModuleDto();
        dto.setId(5L);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(service.getAllModules(ModuleStatusEnum.active)).thenReturn(List.of(dto));
        when(service.createModule(dto)).thenReturn(dto);
        when(service.updateModule(5L, dto)).thenReturn(dto);

        assertThat(controller.getAll(ModuleStatusEnum.active).getBody()).containsExactly(dto);
        assertThat(controller.create(dto, request).getBody()).isSameAs(dto);
        assertThat(controller.updateModule(5L, dto, request).getBody()).isSameAs(dto);
        assertThat(controller.deleteModule(5L, request).getStatusCode().value()).isEqualTo(204);
        verify(audit, times(3)).logAsync(any());
    }
}
