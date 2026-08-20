package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceContentDto;
import org.matchia.matchiabackend.service.MarketplaceContentService;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MarketplaceContentControllerTest {
    @Test
    void readsMutatesAndMapsMarketplaceContentErrors() throws Exception {
        MarketplaceContentService service = mock(MarketplaceContentService.class);
        MarketplaceContentController controller = new MarketplaceContentController(service);
        MarketplaceContentDto dto = new MarketplaceContentDto();
        MultipartFile image = mock(MultipartFile.class);
        when(service.getAllContents()).thenReturn(List.of(dto));
        when(service.getContentsByMarketplaceSlug("atlas")).thenReturn(List.of(dto));
        when(service.createContent(1L, "Title", "Description", "active", "atlas", image)).thenReturn(dto);
        when(service.updateContent(2L, 1L, "Title", "Description", "active", "atlas", image)).thenReturn(dto);

        assertThat(controller.getAllContents().getBody()).containsExactly(dto);
        assertThat(controller.getContentsByMarketplace("atlas").getBody()).containsExactly(dto);
        assertThat(controller.createContent(1L, "Title", "Description", "active", "atlas", image).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateContent(2L, 1L, "Title", "Description", "active", "atlas", image).getBody()).isSameAs(dto);
        assertThat(controller.deleteContent(2L, "atlas").getStatusCode().value()).isEqualTo(204);
        when(service.createContent(eq(1L), eq("bad"), any(), any(), any(), any())).thenThrow(new IllegalArgumentException());
        doThrow(new IllegalArgumentException()).when(service).deleteContent(3L, "atlas");
        assertThat(controller.createContent(1L, "bad", "Description", null, "atlas", null).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.deleteContent(3L, "atlas").getStatusCode().value()).isEqualTo(400);
    }
}
