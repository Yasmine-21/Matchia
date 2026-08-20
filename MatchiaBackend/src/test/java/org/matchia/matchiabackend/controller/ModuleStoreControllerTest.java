package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ModuleStoreRequest;
import org.matchia.matchiabackend.dto.ModuleStoreResponseDto;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.ModuleStoreService;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ModuleStoreControllerTest {
    @Test
    void delegatesModuleAssignmentOperationsAndAuditsMutations() {
        ModuleStoreService service = mock(ModuleStoreService.class);
        AuditLogger audit = mock(AuditLogger.class);
        ModuleStoreController controller = new ModuleStoreController(service, audit);
        ModuleStoreResponseDto dto = new ModuleStoreResponseDto(); dto.setId(9L);
        ModuleStoreRequest request = new ModuleStoreRequest();
        ModuleStore details = new ModuleStore();
        ModuleStoreParameter parameter = new ModuleStoreParameter();
        when(service.getModulesByStore(1L)).thenReturn(List.of(dto));
        when(service.getActiveModulesByStore(1L)).thenReturn(List.of(dto));
        when(service.getAssignment(1L, 2L)).thenReturn(dto);
        when(service.assignFullModuleToStore(request)).thenReturn(dto);
        when(service.toggleModule(1L, 2L, false)).thenReturn(dto);
        when(service.updateOrder(1L, 2L, 3)).thenReturn(dto);
        when(service.updateModuleStore(9L, details)).thenReturn(dto);
        when(service.updateModuleStorePrice(9L, BigDecimal.TEN)).thenReturn(dto);
        when(service.addParameterToModule(9L, parameter)).thenReturn(dto);
        when(service.getParameters(9L)).thenReturn(List.of(parameter));
        when(service.updateParameter(4L, parameter)).thenReturn(dto);
        when(service.deleteParameter(4L)).thenReturn(dto);
        when(service.countModulesByStore(1L)).thenReturn(5L);

        assertThat(controller.getModulesByStore(1L).getBody()).containsExactly(dto);
        assertThat(controller.getActiveModulesByStore(1L).getBody()).containsExactly(dto);
        assertThat(controller.getAssignment(1L, 2L).getBody()).isSameAs(dto);
        assertThat(controller.assignFull(request).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.toggleModule(1L, 2L, java.util.Map.of("actif", false)).getBody()).isSameAs(dto);
        assertThat(controller.updateOrder(1L, 2L, java.util.Map.of("ordre", 3)).getBody()).isSameAs(dto);
        assertThat(controller.updateModuleStore(9L, details).getBody()).isSameAs(dto);
        assertThat(controller.updateModuleStorePrice(9L, java.util.Map.of("price", BigDecimal.TEN)).getBody()).isSameAs(dto);
        assertThat(controller.addParameter(9L, parameter).getBody()).isSameAs(dto);
        assertThat(controller.getParameters(9L).getBody()).containsExactly(parameter);
        assertThat(controller.updateParameter(4L, parameter).getBody()).isSameAs(dto);
        assertThat(controller.deleteParameter(4L).getBody()).isSameAs(dto);
        assertThat(controller.countModules(1L).getBody()).containsEntry("count", 5L);
        controller.deleteModuleStore(9L);
        controller.deleteAssignment(1L, 2L);
        verify(audit, times(7)).logAsync(any());
    }

    @Test
    void mapsAssignmentValidationAndMissingPriceErrors() {
        ModuleStoreService service = mock(ModuleStoreService.class);
        ModuleStoreController controller = new ModuleStoreController(service, mock(AuditLogger.class));
        ModuleStoreRequest request = new ModuleStoreRequest();
        when(service.assignFullModuleToStore(request)).thenThrow(new IllegalArgumentException());
        when(service.updateModuleStorePrice(1L, null)).thenThrow(new RuntimeException());

        assertThat(controller.assignFull(request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.updateModuleStorePrice(1L, java.util.Map.of()).getStatusCode().value()).isEqualTo(404);
    }
}
