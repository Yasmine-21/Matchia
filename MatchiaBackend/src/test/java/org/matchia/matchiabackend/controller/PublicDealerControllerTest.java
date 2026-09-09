package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.service.DealerAccountService;
import org.matchia.matchiabackend.service.DealerPartnershipService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PublicDealerControllerTest {
    @Test
    void delegatesPublicListingRegistrationAndMarketplaceProducts() {
        DealerAccountService accounts = mock(DealerAccountService.class);
        DealerPartnershipService partnerships = mock(DealerPartnershipService.class);
        DealerProductService products = mock(DealerProductService.class);
        PublicDealerController controller = new PublicDealerController(accounts, partnerships, products);
        DealerDtos.RegistrationRequest request = mock(DealerDtos.RegistrationRequest.class);
        MultipartFile logo = mock(MultipartFile.class);
        MultipartFile photo = mock(MultipartFile.class);
        MultipartFile document = mock(MultipartFile.class);
        when(accounts.activePublicDealers()).thenReturn(List.of());
        when(partnerships.publicActiveDealersForBank("atlas")).thenReturn(List.of());
        when(products.publicProducts("atlas", 2L)).thenReturn(List.of());

        assertThat(controller.activeDealers()).isEmpty();
        assertThat(controller.marketplaceDealers("atlas")).isEmpty();
        assertThat(controller.marketplaceProducts("atlas", 2L)).isEmpty();
        controller.register(request, logo, photo, List.of(document));
        verify(accounts).register(request, logo, photo, List.of(document));
    }
}
