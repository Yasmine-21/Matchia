package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.service.DealerPartnershipService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BankDealerControllerTest {
    @Test
    void delegatesBankDealerPartnershipAndPublicationEndpoints() {
        DealerPartnershipService partnerships = mock(DealerPartnershipService.class);
        DealerProductService products = mock(DealerProductService.class);
        BankDealerController controller = new BankDealerController(partnerships, products);
        Authentication auth = mock(Authentication.class);
        DealerDtos.DecisionRequest decision = mock(DealerDtos.DecisionRequest.class);
        when(decision.reason()).thenReturn("reason");
        when(partnerships.availableDealers(auth, 1L)).thenReturn(List.of());
        when(partnerships.availableStoresForBank(auth, "atlas")).thenReturn(List.of());
        when(partnerships.dealersByStore(auth, "atlas", 1L)).thenReturn(List.of());
        when(partnerships.forBank(auth, "atlas")).thenReturn(List.of());
        when(partnerships.sentByBank(auth, "atlas")).thenReturn(List.of());
        when(partnerships.receivedByBank(auth, "atlas")).thenReturn(List.of());
        when(partnerships.activeForBank(auth, "atlas")).thenReturn(List.of());
        when(products.publicationsForBank(auth)).thenReturn(List.of());

        assertThat(controller.availableDealers(auth, 1L)).isEmpty();
        assertThat(controller.availableStores(auth, "atlas")).isEmpty();
        assertThat(controller.dealersByStore(auth, "atlas", 1L)).isEmpty();
        assertThat(controller.partnerships(auth, "atlas")).isEmpty();
        assertThat(controller.sent(auth, "atlas")).isEmpty();
        assertThat(controller.received(auth, "atlas")).isEmpty();
        assertThat(controller.active(auth, "atlas")).isEmpty();
        controller.approve(auth, 2L);
        controller.reject(auth, 2L, decision);
        controller.cancel(auth, 2L);
        controller.decidePartnership(auth, 2L, DealerPartnershipStatusEnum.PENDING, null);
        assertThat(controller.publications(auth)).isEmpty();
        controller.decidePublication(auth, 3L, ProductPublicationStatusEnum.APPROVED, decision);
        verify(partnerships).decide(auth, 2L, DealerPartnershipStatusEnum.REJECTED, "reason");
        verify(products).decide(auth, 3L, ProductPublicationStatusEnum.APPROVED, "reason");
    }
}
