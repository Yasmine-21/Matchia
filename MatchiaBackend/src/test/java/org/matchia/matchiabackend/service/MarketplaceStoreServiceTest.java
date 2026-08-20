package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceStoreDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.StoreRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MarketplaceStoreServiceTest {
    @Test
    void createsDefaultEnabledAssignmentAndDelegatesCrud() {
        MarketplaceStoreRepository assignments = mock(MarketplaceStoreRepository.class);
        MarketplaceRepository marketplaces = mock(MarketplaceRepository.class);
        StoreRepository stores = mock(StoreRepository.class);
        MarketplaceStoreService service = new MarketplaceStoreService(assignments, marketplaces, stores);
        Marketplace marketplace = new Marketplace(); marketplace.setId(1L);
        Store store = new Store(); store.setId(2L);
        when(marketplaces.findById(1L)).thenReturn(Optional.of(marketplace));
        when(stores.findById(2L)).thenReturn(Optional.of(store));
        when(assignments.save(any())).thenAnswer(i -> i.getArgument(0));

        MarketplaceStore created = service.create(new MarketplaceStoreDto(null, null, 1L, 2L, null, null));
        assertThat(created.getMarketplace()).isSameAs(marketplace);
        assertThat(created.getStore()).isSameAs(store);
        assertThat(created.getEnabled()).isTrue();
        assertThat(created.getVisible()).isTrue();
        when(assignments.findAll()).thenReturn(List.of(created));
        assertThat(service.findAll()).containsExactly(created);
        service.deleteById(9L);
        verify(assignments).deleteById(9L);
    }

    @Test
    void rejectsMissingRequiredRelationsAndUnknownUpdate() {
        MarketplaceStoreRepository assignments = mock(MarketplaceStoreRepository.class);
        MarketplaceStoreService service = new MarketplaceStoreService(assignments, mock(MarketplaceRepository.class), mock(StoreRepository.class));
        assertThatThrownBy(() -> service.create(new MarketplaceStoreDto())) .isInstanceOf(IllegalArgumentException.class);
        when(assignments.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(1L, new MarketplaceStoreDto())).isInstanceOf(java.util.NoSuchElementException.class);
    }
}
