package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.RequestRejectionDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.mapper.RequestMapper;
import org.matchia.matchiabackend.service.RequestService;

import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RequestControllerTest {

    @Test
    void readsUpdatesAndDeletesRequests() {
        RequestService service = mock(RequestService.class);
        RequestMapper mapper = mock(RequestMapper.class);
        RequestController controller = new RequestController(service, mapper);
        Request request = new Request();
        request.setId(3L);
        RequestDto dto = new RequestDto();
        dto.setId(3L);
        when(service.findAll()).thenReturn(List.of(request));
        when(service.findByBankId(4L)).thenReturn(List.of(request));
        when(service.findById(3L)).thenReturn(Optional.of(request));
        when(mapper.toDto(request)).thenReturn(dto);
        when(mapper.toEntity(dto)).thenReturn(request);
        when(service.save(request)).thenReturn(request);

        assertThat(controller.getAll().getBody()).containsExactly(dto);
        assertThat(controller.getByBankId(4L).getBody()).containsExactly(dto);
        assertThat(controller.getById(3L).getBody()).isEqualTo(dto);
        assertThat(controller.update(3L, dto).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.delete(3L).getStatusCode().value()).isEqualTo(204);
        verify(service).deleteById(3L);
    }

    @Test
    void returnsNotFoundForMissingCrudResource() {
        RequestService service = mock(RequestService.class);
        RequestController controller = new RequestController(service, mock(RequestMapper.class));
        when(service.findById(8L)).thenReturn(Optional.empty());

        assertThat(controller.getById(8L).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.update(8L, new RequestDto()).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.delete(8L).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void createsAndHandlesInvalidCreation() {
        RequestService service = mock(RequestService.class);
        RequestMapper mapper = mock(RequestMapper.class);
        RequestController controller = new RequestController(service, mapper);
        RequestDto dto = new RequestDto();
        Request request = new Request();
        when(service.createJsonRequest(dto)).thenReturn(request);
        when(mapper.toDto(request)).thenReturn(dto);

        assertThat(controller.create(dto).getStatusCode().value()).isEqualTo(201);
        when(service.createJsonRequest(dto)).thenThrow(new IllegalArgumentException("invalid"));
        assertThat(controller.create(dto).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void approvesRejectsAndUpdatesStatusWithErrorsMappedToHttpResponses() {
        RequestService service = mock(RequestService.class);
        RequestMapper mapper = mock(RequestMapper.class);
        RequestController controller = new RequestController(service, mapper);
        Request request = new Request();
        RequestDto dto = new RequestDto();
        when(service.approveRequest(1L)).thenReturn(request);
        when(service.rejectRequest(1L, "reason")).thenReturn(request);
        when(service.updateStatus(1L, RequestStatusEnum.approved)).thenReturn(request);
        when(mapper.toDto(request)).thenReturn(dto);

        assertThat(controller.approve(1L).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.reject(1L, new RequestRejectionDto("reason")).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.updateStatus(1L, java.util.Map.of("status", "approved")).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.updateStatus(1L, java.util.Map.of("status", "unknown")).getStatusCode().value()).isEqualTo(400);
        when(service.approveRequest(2L)).thenThrow(new NoSuchElementException());
        when(service.rejectRequest(2L, null)).thenThrow(new IllegalStateException());
        assertThat(controller.approve(2L).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.reject(2L, null).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void returnsLogosAndPaymentResponses() throws Exception {
        RequestService service = mock(RequestService.class);
        RequestController controller = new RequestController(service, mock(RequestMapper.class));
        Bank bank = new Bank();
        bank.setName("Bank");
        when(service.getLogoFile("logo.png")).thenReturn(new byte[]{1});
        when(service.validatePaymentAndProvisionBank(1L)).thenReturn(bank);

        assertThat(controller.getLogo("logo.png").getHeaders().getContentType().toString()).isEqualTo("image/png");
        assertThat(controller.confirmPayment(1L).getStatusCode().value()).isEqualTo(200);
        when(service.getLogoFile("missing.jpg")).thenThrow(new IOException());
        doThrow(new RuntimeException("failure")).when(service).validatePaymentAndProvisionBank(2L);
        assertThat(controller.getLogo("missing.jpg").getStatusCode().value()).isEqualTo(404);
        assertThat(controller.confirmPayment(2L).getStatusCode().value()).isEqualTo(500);
    }
}
