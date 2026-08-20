package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceConfigDto;
import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.mapper.MarketplaceMapper;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.MarketplaceService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MarketplaceControllerTest {

    @Test
    void readsPublicAndAdministrativeMarketplaceRepresentations() {
        MarketplaceService service = mock(MarketplaceService.class);
        MarketplaceMapper mapper = mock(MarketplaceMapper.class);
        MarketplaceController controller = new MarketplaceController(service, mapper, mock(AuditLogger.class));
        Marketplace marketplace = new Marketplace();
        MarketplaceDto dto = new MarketplaceDto();
        MarketplaceDto publicDto = new MarketplaceDto();
        when(service.findAll()).thenReturn(List.of(marketplace));
        when(service.findBySlug("bank")).thenReturn(Optional.of(marketplace));
        when(mapper.toDto(marketplace)).thenReturn(dto);
        when(mapper.toPublicDto(marketplace)).thenReturn(publicDto);

        assertThat(controller.getAllMarketplaces().getBody()).containsExactly(dto);
        assertThat(controller.getMarketplaceBySlug("bank").getBody()).isEqualTo(dto);
        assertThat(controller.getPublicMarketplaceBySlug("bank").getBody()).isEqualTo(publicDto);
        when(service.findBySlug("missing")).thenReturn(Optional.empty());
        assertThat(controller.getMarketplaceBySlug("missing").getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void configuresUpdatesAndDeletesWithAuditTrail() {
        MarketplaceService service = mock(MarketplaceService.class);
        MarketplaceMapper mapper = mock(MarketplaceMapper.class);
        AuditLogger audit = mock(AuditLogger.class);
        MarketplaceController controller = new MarketplaceController(service, mapper, audit);
        Marketplace marketplace = new Marketplace();
        marketplace.setId(7L);
        MarketplaceDto dto = new MarketplaceDto();
        MarketplaceConfigDto config = new MarketplaceConfigDto();
        when(service.configureMarketplace(config)).thenReturn(marketplace);
        when(service.updateMarketplace(7L, config)).thenReturn(marketplace);
        when(service.updateStatus(7L, MarketplaceStatusEnum.active)).thenReturn(marketplace);
        when(mapper.toDto(marketplace)).thenReturn(dto);

        assertThat(controller.configureMarketplace(config).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateMarketplace(7L, config).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.updateStatus(7L, java.util.Map.of("status", "active")).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.deleteMarketplace(7L).getStatusCode().value()).isEqualTo(204);
        verify(audit, times(4)).logAsync(any());
    }

    @Test
    void mapsValidationAndMissingResourceErrors() {
        MarketplaceService service = mock(MarketplaceService.class);
        MarketplaceController controller = new MarketplaceController(service, mock(MarketplaceMapper.class), mock(AuditLogger.class));
        MarketplaceConfigDto config = new MarketplaceConfigDto();
        when(service.configureMarketplace(config)).thenThrow(new IllegalArgumentException());
        when(service.updateMarketplace(2L, config)).thenThrow(new NoSuchElementException());
        doThrow(new NoSuchElementException()).when(service).deleteById(2L);

        assertThat(controller.configureMarketplace(config).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.updateMarketplace(2L, config).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.updateStatus(2L, null).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.updateStatus(2L, java.util.Map.of("status", "bad")).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.deleteMarketplace(2L).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void uploadsBannerAndLogoAndMapsStorageErrors() throws Exception {
        MarketplaceService service = mock(MarketplaceService.class);
        MarketplaceController controller = new MarketplaceController(service, mock(MarketplaceMapper.class), mock(AuditLogger.class));
        MultipartFile file = mock(MultipartFile.class);
        when(service.saveBanniere(file)).thenReturn("/banner.png");
        when(service.saveLogo(file)).thenReturn("/logo.png");

        assertThat(controller.uploadBanniere(file).getBody()).containsEntry("banniereUrl", "/banner.png");
        assertThat(controller.uploadLogo(file).getBody()).containsEntry("logoImageUrl", "/logo.png");
        when(service.saveBanniere(file)).thenThrow(new IOException());
        when(service.saveLogo(file)).thenThrow(new IllegalArgumentException());
        assertThat(controller.uploadBanniere(file).getStatusCode().value()).isEqualTo(500);
        assertThat(controller.uploadLogo(file).getStatusCode().value()).isEqualTo(400);
    }
}
