package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.PartnershipContractDtos;
import org.matchia.matchiabackend.service.PartnershipContractService;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PartnershipContractControllerTest {
    @Test
    void delegatesBankDealerAndSaasContractFlows() {
        PartnershipContractService service = mock(PartnershipContractService.class);
        PartnershipContractController controller = new PartnershipContractController(service);
        Authentication auth = mock(Authentication.class);
        PartnershipContractDtos.UpsertRequest upsert = mock(PartnershipContractDtos.UpsertRequest.class);
        PartnershipContractDtos.RejectionRequest rejection = mock(PartnershipContractDtos.RejectionRequest.class);
        when(rejection.reason()).thenReturn("reason");
        when(service.forBank(auth)).thenReturn(List.of());
        when(service.forDealer(auth)).thenReturn(List.of());
        when(service.supervise(auth)).thenReturn(List.of());

        assertThat(controller.bankContracts(auth)).isEmpty();
        controller.bankContract(auth, 1L);
        controller.createOrPrepare(auth, 1L, upsert);
        controller.update(auth, 1L, upsert);
        controller.send(auth, 2L);
        controller.activate(auth, 2L);
        controller.terminate(auth, 2L, rejection);
        assertThat(controller.dealerContracts(auth)).isEmpty();
        controller.dealerContract(auth, 2L);
        controller.accept(auth, 2L);
        controller.reject(auth, 2L, rejection);
        assertThat(controller.supervise(auth)).isEmpty();
        verify(service).terminate(auth, 2L, "reason");
        verify(service).rejectByDealer(auth, 2L, "reason");
    }
}
