package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.BankService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BankControllerTest {

    @Test
    void readsCreatesUpdatesAndDeletesBanksWithAudit() {
        BankService service = mock(BankService.class);
        AuditLogger audit = mock(AuditLogger.class);
        BankController controller = new BankController(service, audit);
        BankDto dto = new BankDto();
        dto.setId(1L);
        when(service.getAllBanks()).thenReturn(List.of(dto));
        when(service.createBank(dto)).thenReturn(dto);
        when(service.updateBank(1L, dto)).thenReturn(dto);

        assertThat(controller.getBanks()).containsExactly(dto);
        assertThat(controller.createBank(dto)).isSameAs(dto);
        assertThat(controller.updateBank(1L, dto)).isSameAs(dto);
        controller.deleteBank(1L);
        verify(audit, times(3)).logAsync(any());
    }

    @Test
    void createsAndUpdatesMultipartBanksAndMapsErrors() throws Exception {
        BankService service = mock(BankService.class);
        BankController controller = new BankController(service, mock(AuditLogger.class));
        MultipartFile logo = mock(MultipartFile.class);
        BankDto dto = new BankDto();
        dto.setId(2L);
        when(service.createBankMultipart(eq(logo), eq("Bank"), any(), any(), any(), any(), any(), any(), any(), eq(BankStatusEnum.active))).thenReturn(dto);
        when(service.updateBankMultipart(eq(2L), eq(logo), eq("Bank"), any(), any(), any(), any(), any(), any(), any(), eq(BankStatusEnum.active))).thenReturn(dto);

        assertThat(controller.createBankMultipart(logo, "Bank", null, null, null, null, null, null, null, BankStatusEnum.active).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateBankMultipart(2L, logo, "Bank", null, null, null, null, null, null, null, BankStatusEnum.active).getStatusCode().value()).isEqualTo(200);
        when(service.createBankMultipart(any(), eq("bad"), any(), any(), any(), any(), any(), any(), any(), any())).thenThrow(new IllegalArgumentException());
        assertThat(controller.createBankMultipart(logo, "bad", null, null, null, null, null, null, null, null).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void updatesStatusAndRejectsBadStatus() {
        BankService service = mock(BankService.class);
        BankController controller = new BankController(service, mock(AuditLogger.class));
        BankDto dto = new BankDto();
        when(service.updateStatus(3L, BankStatusEnum.active)).thenReturn(dto);

        assertThat(controller.updateBankStatus(3L, java.util.Map.of("status", "active")).getBody()).isSameAs(dto);
        assertThat(controller.updateBankStatus(3L, java.util.Map.of("status", "bad")).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.updateBankStatus(3L, java.util.Map.of()).getStatusCode().value()).isEqualTo(400);
    }
}
