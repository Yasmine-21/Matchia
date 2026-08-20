package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceStoreModuleDto;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.mapper.MarketplaceStoreModuleMapper;
import org.matchia.matchiabackend.service.MarketplaceStoreModuleService;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MarketplaceStoreModuleControllerTest {
    @Test
    void handlesMarketplaceStoreModuleCrudAndErrors() {
        MarketplaceStoreModuleService service = mock(MarketplaceStoreModuleService.class);
        MarketplaceStoreModuleMapper mapper = mock(MarketplaceStoreModuleMapper.class);
        MarketplaceStoreModuleController controller = new MarketplaceStoreModuleController(service, mapper);
        MarketplaceStoreModule entity = new MarketplaceStoreModule();
        MarketplaceStoreModuleDto dto = new MarketplaceStoreModuleDto();
        when(service.create(dto)).thenReturn(entity);
        when(service.findAll()).thenReturn(List.of(entity));
        when(service.findById(1L)).thenReturn(Optional.of(entity));
        when(service.update(1L, dto)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(dto);

        assertThat(controller.create(dto).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.getAll().getBody()).containsExactly(dto);
        assertThat(controller.getById(1L).getBody()).isSameAs(dto);
        assertThat(controller.update(1L, dto).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.delete(1L).getStatusCode().value()).isEqualTo(204);
        when(service.create(dto)).thenThrow(new NoSuchElementException());
        when(service.findById(2L)).thenReturn(Optional.empty());
        assertThat(controller.create(dto).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.getById(2L).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.update(2L, dto).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.delete(2L).getStatusCode().value()).isEqualTo(404);
    }
}
