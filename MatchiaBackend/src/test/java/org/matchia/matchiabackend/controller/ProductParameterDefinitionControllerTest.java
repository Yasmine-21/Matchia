package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionDto;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionRequestDto;
import org.matchia.matchiabackend.service.ProductParameterDefinitionService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ProductParameterDefinitionControllerTest {
    @Test
    void delegatesCrudAndMapsErrors() {
        ProductParameterDefinitionService service = mock(ProductParameterDefinitionService.class);
        ProductParameterDefinitionController controller = new ProductParameterDefinitionController(service);
        ProductParameterDefinitionRequestDto request = new ProductParameterDefinitionRequestDto();
        ProductParameterDefinitionDto dto = new ProductParameterDefinitionDto();
        when(service.getByStore(1L)).thenReturn(List.of(dto));
        when(service.create(request)).thenReturn(dto);
        when(service.update(2L, request)).thenReturn(dto);

        assertThat(controller.getByStore(1L).getBody()).containsExactly(dto);
        assertThat(controller.create(request).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.update(2L, request).getBody()).isSameAs(dto);
        assertThat(controller.delete(2L).getStatusCode().value()).isEqualTo(204);
        when(service.getByStore(3L)).thenThrow(new RuntimeException());
        when(service.create(request)).thenThrow(new IllegalArgumentException());
        when(service.update(3L, request)).thenThrow(new RuntimeException());
        doThrow(new RuntimeException()).when(service).delete(3L);
        assertThat(controller.getByStore(3L).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.create(request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.update(3L, request).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.delete(3L).getStatusCode().value()).isEqualTo(404);
    }
}
