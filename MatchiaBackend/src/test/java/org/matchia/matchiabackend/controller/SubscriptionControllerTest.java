package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.CreateRenewalRequestDto;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.SubscriptionOverviewDto;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.mapper.RequestMapper;
import org.matchia.matchiabackend.service.SubscriptionService;

import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SubscriptionControllerTest {

    @Test
    void returnsSubscriptionOverview() {
        SubscriptionService service = mock(SubscriptionService.class);
        SubscriptionController controller = new SubscriptionController(service, mock(RequestMapper.class));
        SubscriptionOverviewDto overview = new SubscriptionOverviewDto();
        when(service.getOverview()).thenReturn(overview);

        assertThat(controller.getSubscriptions().getBody()).isSameAs(overview);
    }

    @Test
    void createsRenewalRequestAndMapsBusinessErrors() {
        SubscriptionService service = mock(SubscriptionService.class);
        RequestMapper mapper = mock(RequestMapper.class);
        SubscriptionController controller = new SubscriptionController(service, mapper);
        CreateRenewalRequestDto payload = new CreateRenewalRequestDto();
        payload.setBankId(3L);
        payload.setCreatedBy("admin");
        Request request = new Request();
        RequestDto dto = new RequestDto();
        when(service.createRenewalRequest(1L, 3L, "admin")).thenReturn(request);
        when(mapper.toDto(request)).thenReturn(dto);

        assertThat(controller.createRenewalRequest(1L, payload).getStatusCode().value()).isEqualTo(201);
        verify(service).createRenewalRequest(1L, 3L, "admin");
        when(service.createRenewalRequest(2L, null, null)).thenThrow(new NoSuchElementException());
        when(service.createRenewalRequest(3L, null, null)).thenThrow(new IllegalStateException());
        assertThat(controller.createRenewalRequest(2L, null).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.createRenewalRequest(3L, null).getStatusCode().value()).isEqualTo(400);
    }
}
