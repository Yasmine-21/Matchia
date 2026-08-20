package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceStoreModuleDto;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MarketplaceStoreModuleServiceTest {
    @Test
    void createsDefaultVisibleModuleAssignmentAndDelegatesCrud() {
        MarketplaceStoreModuleRepository assignments = mock(MarketplaceStoreModuleRepository.class);
        MarketplaceStoreRepository stores = mock(MarketplaceStoreRepository.class);
        ModuleRepository modules = mock(ModuleRepository.class);
        MarketplaceStoreModuleService service = new MarketplaceStoreModuleService(assignments, stores, modules);
        MarketplaceStore store = new MarketplaceStore(); store.setId(1L);
        Module module = new Module(); module.setId(2L);
        when(stores.findById(1L)).thenReturn(Optional.of(store));
        when(modules.findById(2L)).thenReturn(Optional.of(module));
        when(assignments.save(any())).thenAnswer(i -> i.getArgument(0));

        MarketplaceStoreModule created = service.create(new MarketplaceStoreModuleDto(null, 1L, 2L, null, null));
        assertThat(created.getMarketplaceStore()).isSameAs(store);
        assertThat(created.getModule()).isSameAs(module);
        assertThat(created.getEnabled()).isTrue();
        assertThat(created.getVisible()).isTrue();
        when(assignments.findAll()).thenReturn(List.of(created));
        assertThat(service.findAll()).containsExactly(created);
        service.deleteById(9L);
        verify(assignments).deleteById(9L);
    }

    @Test
    void rejectsInvalidCreationAndMissingUpdate() {
        MarketplaceStoreModuleRepository assignments = mock(MarketplaceStoreModuleRepository.class);
        MarketplaceStoreModuleService service = new MarketplaceStoreModuleService(assignments, mock(MarketplaceStoreRepository.class), mock(ModuleRepository.class));
        assertThatThrownBy(() -> service.create(new MarketplaceStoreModuleDto())).isInstanceOf(IllegalArgumentException.class);
        when(assignments.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(1L, new MarketplaceStoreModuleDto())).isInstanceOf(java.util.NoSuchElementException.class);
    }
}
