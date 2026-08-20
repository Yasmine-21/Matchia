package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ContentDto;
import org.matchia.matchiabackend.dto.ContentVisibilityRequestDto;
import org.matchia.matchiabackend.service.ContentService;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ContentControllerTest {

    @Test
    void readsMarketplaceContentVariants() {
        ContentService service = mock(ContentService.class);
        ContentController controller = new ContentController(service);
        ContentDto content = new ContentDto();
        when(service.getAllContents()).thenReturn(List.of(content));
        when(service.getContentsByMarketplaceSlug("bank")).thenReturn(List.of(content));
        when(service.getContentsByMarketplaceSlugForAdmin("bank")).thenReturn(List.of(content));

        assertThat(controller.getAllContents().getBody()).containsExactly(content);
        assertThat(controller.getContentsByMarketplace("bank").getBody()).containsExactly(content);
        assertThat(controller.getContentsByMarketplaceForAdmin("bank").getBody()).containsExactly(content);
    }

    @Test
    void createsUpdatesAndDeletesContent() throws Exception {
        ContentService service = mock(ContentService.class);
        ContentController controller = new ContentController(service);
        ContentDto content = new ContentDto();
        MultipartFile image = mock(MultipartFile.class);
        when(service.createContent(1L, "Title", "Description", "active", "bank", image)).thenReturn(content);
        when(service.updateContent(2L, 1L, "Title", "Description", "active", "bank", image)).thenReturn(content);

        assertThat(controller.createContent(1L, "Title", "Description", "active", "bank", image).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateContent(2L, 1L, "Title", "Description", "active", "bank", image).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.deleteContent(2L).getStatusCode().value()).isEqualTo(204);
        when(service.createContent(eq(1L), eq("bad"), any(), any(), any(), any())).thenThrow(new IllegalArgumentException());
        doThrow(new IllegalArgumentException()).when(service).deleteContent(3L);
        assertThat(controller.createContent(1L, "bad", "Description", null, null, null).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.deleteContent(3L).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void validatesAndUpdatesMarketplaceVisibility() {
        ContentService service = mock(ContentService.class);
        ContentController controller = new ContentController(service);
        ContentVisibilityRequestDto request = new ContentVisibilityRequestDto();
        request.setMarketplaceSlug("bank");
        request.setVisible(true);
        ContentDto content = new ContentDto();
        when(service.updateMarketplaceVisibility(1L, "bank", true)).thenReturn(content);

        assertThat(controller.updateVisibility(1L, request).getBody()).isSameAs(content);
        assertThat(controller.updateVisibility(1L, null).getStatusCode().value()).isEqualTo(400);
        request.setVisible(null);
        assertThat(controller.updateVisibility(1L, request).getStatusCode().value()).isEqualTo(400);
    }
}
