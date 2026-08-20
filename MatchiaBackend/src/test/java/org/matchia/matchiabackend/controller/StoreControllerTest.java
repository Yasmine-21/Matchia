package org.matchia.matchiabackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.dto.StoreMarketplaceCountDto;
import org.matchia.matchiabackend.entity.enums.StoreStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.StoreService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StoreControllerTest {

    @Test
    void readsStoresAndMarketplaceCounts() {
        StoreService service = mock(StoreService.class);
        StoreController controller = new StoreController(service, mock(AuditLogger.class));
        StoreDto store = new StoreDto();
        StoreMarketplaceCountDto count = new StoreMarketplaceCountDto(1L, "Store", 2L);
        when(service.getAllStores(StoreStatusEnum.active)).thenReturn(List.of(store));
        when(service.getDistinctMarketplaceCountsByStore()).thenReturn(List.of(count));

        assertThat(controller.getAllStores(StoreStatusEnum.active).getBody()).containsExactly(store);
        assertThat(controller.getMarketplaceCounts().getBody()).containsExactly(count);
    }

    @Test
    void createsUpdatesAndDeletesWithAuditMetadata() {
        StoreService service = mock(StoreService.class);
        AuditLogger audit = mock(AuditLogger.class);
        StoreController controller = new StoreController(service, audit);
        StoreDto dto = new StoreDto();
        dto.setId(4L);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("User-Agent")).thenReturn("test");
        when(service.createStore(dto)).thenReturn(dto);
        when(service.updateStore(4L, dto)).thenReturn(dto);

        assertThat(controller.addStore(dto, request).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateStore(4L, dto, request).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.deleteStore(4L, request).getStatusCode().value()).isEqualTo(204);
        verify(audit, times(3)).logAsync(any());
    }

    @Test
    void mapsStoreValidationFailuresAndAuditsThem() {
        StoreService service = mock(StoreService.class);
        AuditLogger audit = mock(AuditLogger.class);
        StoreController controller = new StoreController(service, audit);
        StoreDto dto = new StoreDto();
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(service.createStore(dto)).thenThrow(new IllegalArgumentException());
        when(service.updateStore(2L, dto)).thenThrow(new IllegalArgumentException());

        assertThat(controller.addStore(dto, request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.updateStore(2L, dto, request).getStatusCode().value()).isEqualTo(400);
        verify(audit, times(2)).logAsync(any());
    }
}
