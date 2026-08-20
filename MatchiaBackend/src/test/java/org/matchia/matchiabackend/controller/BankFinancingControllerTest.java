package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.FinancingRequestDtos;
import org.matchia.matchiabackend.service.FinancingRequestService;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BankFinancingControllerTest {

    @Test
    void delegatesEveryBankFinancingEndpointUsingAuthenticatedEmail() {
        FinancingRequestService service = mock(FinancingRequestService.class);
        BankFinancingController controller = new BankFinancingController(service);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("bank@example.com");
        ClientProfileDto client = mock(ClientProfileDto.class);
        FinancingRequestDtos.SummaryDto summary = mock(FinancingRequestDtos.SummaryDto.class);
        FinancingRequestDtos.DetailDto detail = mock(FinancingRequestDtos.DetailDto.class);
        FinancingRequestDtos.ProcessRequest process = new FinancingRequestDtos.ProcessRequest();
        Resource resource = mock(Resource.class);
        when(resource.getFilename()).thenReturn("document.pdf");
        when(service.bankClients("bank@example.com")).thenReturn(List.of(client));
        when(service.bankClient("bank@example.com", 1L)).thenReturn(client);
        when(service.bankClientRequests("bank@example.com", 1L)).thenReturn(List.of(summary));
        when(service.bankRequests("bank@example.com", 2L, "pending", "ali")).thenReturn(List.of(summary));
        when(service.bankRequest("bank@example.com", 3L)).thenReturn(detail);
        when(service.process("bank@example.com", 3L, process)).thenReturn(detail);
        when(service.documentForBank("bank@example.com", 3L, 4L)).thenReturn(resource);

        assertThat(controller.clients(auth)).containsExactly(client);
        assertThat(controller.client(auth, 1L)).isSameAs(client);
        assertThat(controller.clientRequests(auth, 1L)).containsExactly(summary);
        assertThat(controller.requests(auth, 2L, "pending", "ali")).containsExactly(summary);
        assertThat(controller.request(auth, 3L)).isSameAs(detail);
        assertThat(controller.process(auth, 3L, process)).isSameAs(detail);
        assertThat(controller.download(auth, 3L, 4L).getHeaders().getFirst("Content-Disposition")).contains("document.pdf");
    }
}
