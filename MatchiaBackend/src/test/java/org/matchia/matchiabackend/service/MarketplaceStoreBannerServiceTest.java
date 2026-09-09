package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreBannerRepository;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MarketplaceStoreBannerServiceTest {
    @Test
    void getsAndReplacesBannerForOwningBank() throws Exception {
        MarketplaceStoreRepository repository = mock(MarketplaceStoreRepository.class);
        MarketplaceStoreBannerRepository bannerRepository = mock(MarketplaceStoreBannerRepository.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        MarketplaceService marketplaceService = mock(MarketplaceService.class);
        MarketplaceStoreBannerService service = new MarketplaceStoreBannerService(repository, bannerRepository, security, marketplaceService);
        Authentication authentication = mock(Authentication.class);
        Bank bank = new Bank(); bank.setId(1L);
        User user = new User(); user.setRole(RoleEnum.ADMIN_BANK); user.setBank(bank);
        Marketplace marketplace = new Marketplace(); marketplace.setId(2L); marketplace.setBank(bank);
        Store store = new Store(); store.setId(3L);
        MarketplaceStore assignment = new MarketplaceStore(); assignment.setId(4L); assignment.setMarketplace(marketplace); assignment.setStore(store); assignment.setBannerImageUrl("old");
        Module bannerModule = new Module(); bannerModule.setName("Banniere");
        MarketplaceStoreModule bannerAssignment = new MarketplaceStoreModule();
        bannerAssignment.setModule(bannerModule); bannerAssignment.setEnabled(true); bannerAssignment.setVisible(true);
        assignment.setMarketplaceStoreModules(java.util.List.of(bannerAssignment));
        when(security.currentUser(authentication)).thenReturn(user);
        when(repository.findById(4L)).thenReturn(Optional.of(assignment));
        when(repository.save(assignment)).thenReturn(assignment);
        when(bannerRepository.findByMarketplaceStore_IdOrderByDisplayOrderAscIdAsc(4L)).thenReturn(java.util.List.of());
        when(marketplaceService.saveBanniere(any())).thenReturn("new");

        assertThat(service.getBanner(authentication, 4L).getBannerImageUrl()).isEqualTo("old");
        assertThat(service.replaceBanner(authentication, 4L, new MockMultipartFile("banner", "a.png", "image/png", new byte[]{1})).getBannerImageUrl()).isEqualTo("new");
    }

    @Test
    void rejectsInvalidFileAndUnauthorizedOrForeignUser() {
        MarketplaceStoreRepository repository = mock(MarketplaceStoreRepository.class);
        MarketplaceStoreBannerRepository bannerRepository = mock(MarketplaceStoreBannerRepository.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        MarketplaceStoreBannerService service = new MarketplaceStoreBannerService(repository, bannerRepository, security, mock(MarketplaceService.class));
        Authentication authentication = mock(Authentication.class);
        User user = new User(); user.setRole(RoleEnum.CLIENT);
        when(security.currentUser(authentication)).thenReturn(user);
        assertThatThrownBy(() -> service.getBanner(authentication, 1L)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.replaceBanner(authentication, 1L, new MockMultipartFile("b", "x.txt", "text/plain", new byte[]{1}))).isInstanceOf(ResponseStatusException.class);
    }
}
