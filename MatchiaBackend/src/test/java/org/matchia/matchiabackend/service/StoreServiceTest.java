package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.dto.StoreMarketplaceCountDto;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.entity.enums.StoreStatusEnum;
import org.matchia.matchiabackend.mapper.StoreMapper;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreServiceTest {

    @Mock
    private StoreRepository storeRepository;
    @Mock
    private StoreMapper storeMapper;
    @Mock
    private ModuleStoreRepository moduleStoreRepository;
    @Mock
    private MarketplaceStoreRepository marketplaceStoreRepository;

    @InjectMocks
    private StoreService storeService;

    @Test
    void getAllStores_noStatus_shouldReturnAllStores() {
        Store store = new Store();
        store.setId(1L);
        StoreDto dto = new StoreDto();
        dto.setId(1L);

        when(storeRepository.findAll()).thenReturn(List.of(store));
        when(storeMapper.toDto(store)).thenReturn(dto);
        when(moduleStoreRepository.countByStoreIdAndActifTrueAndModuleStatus(1L, ModuleStatusEnum.active)).thenReturn(5L);

        List<StoreDto> result = storeService.getAllStores();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getModulesCount()).isEqualTo(5);
        verify(storeRepository).findAll();
    }

    @Test
    void getAllStores_withStatus_shouldReturnStoresByStatus() {
        Store store = new Store();
        store.setId(2L);
        StoreDto dto = new StoreDto();
        dto.setId(2L);

        when(storeRepository.findByStatus(StoreStatusEnum.active)).thenReturn(List.of(store));
        when(storeMapper.toDto(store)).thenReturn(dto);
        when(moduleStoreRepository.countByStoreIdAndActifTrueAndModuleStatus(2L, ModuleStatusEnum.active)).thenReturn(3L);

        List<StoreDto> result = storeService.getAllStores(StoreStatusEnum.active);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getModulesCount()).isEqualTo(3);
        verify(storeRepository).findByStatus(StoreStatusEnum.active);
    }

    @Test
    void getDistinctMarketplaceCountsByStore_shouldReturnCounts() {
        StoreMarketplaceCountDto countDto = new StoreMarketplaceCountDto(1L, "Store A", 10L);

        when(marketplaceStoreRepository.countDistinctMarketplacesByStore(MarketplaceStatusEnum.active))
                .thenReturn(List.of(countDto));

        List<StoreMarketplaceCountDto> result = storeService.getDistinctMarketplaceCountsByStore();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).storeName()).isEqualTo("Store A");
    }

    @Test
    void createStore_validInput_shouldReturnCreatedStore() {
        StoreDto requestDto = new StoreDto();
        requestDto.setPrice(BigDecimal.valueOf(100));

        Store store = new Store();
        Store savedStore = new Store();
        StoreDto responseDto = new StoreDto();

        when(storeMapper.toEntity(requestDto)).thenReturn(store);
        when(storeRepository.save(store)).thenReturn(savedStore);
        when(storeMapper.toDto(savedStore)).thenReturn(responseDto);

        StoreDto result = storeService.createStore(requestDto);

        assertThat(result).isNotNull();
        verify(storeRepository).save(store);
    }

    @Test
    void createStore_nullPrice_shouldThrowException() {
        StoreDto requestDto = new StoreDto();
        requestDto.setPrice(null);

        assertThatThrownBy(() -> storeService.createStore(requestDto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Le prix du store est requis et doit etre superieur ou egal a 0.");
    }
    
    @Test
    void createStore_negativePrice_shouldThrowException() {
        StoreDto requestDto = new StoreDto();
        requestDto.setPrice(BigDecimal.valueOf(-10));

        assertThatThrownBy(() -> storeService.createStore(requestDto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Le prix du store est requis et doit etre superieur ou egal a 0.");
    }

    @Test
    void updateStore_existingId_shouldReturnUpdatedStore() {
        Long id = 1L;
        StoreDto requestDto = new StoreDto();
        requestDto.setName("New Name");
        requestDto.setDescription("New Desc");
        requestDto.setPrice(BigDecimal.valueOf(200));
        requestDto.setStatus(StoreStatusEnum.active);

        Store existingStore = new Store();
        existingStore.setId(id);

        Store savedStore = new Store();
        StoreDto responseDto = new StoreDto();

        when(storeRepository.findById(id)).thenReturn(Optional.of(existingStore));
        when(storeRepository.save(any(Store.class))).thenReturn(savedStore);
        when(storeMapper.toDto(savedStore)).thenReturn(responseDto);

        StoreDto result = storeService.updateStore(id, requestDto);

        assertThat(result).isNotNull();
        assertThat(existingStore.getName()).isEqualTo("New Name");
        assertThat(existingStore.getDescription()).isEqualTo("New Desc");
        assertThat(existingStore.getPrice()).isEqualTo(BigDecimal.valueOf(200));
        assertThat(existingStore.getStatus()).isEqualTo(StoreStatusEnum.active);
        verify(storeRepository).save(existingStore);
    }

    @Test
    void updateStore_nonExistingId_shouldThrowException() {
        when(storeRepository.findById(99L)).thenReturn(Optional.empty());

        StoreDto requestDto = new StoreDto();
        assertThatThrownBy(() -> storeService.updateStore(99L, requestDto))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Store non trouvé");
    }

    @Test
    void updateStore_nullPrice_shouldNotUpdatePrice() {
        Long id = 1L;
        StoreDto requestDto = new StoreDto();
        requestDto.setName("New Name");
        requestDto.setPrice(null); // Not updated

        Store existingStore = new Store();
        existingStore.setId(id);
        existingStore.setPrice(BigDecimal.valueOf(50));

        when(storeRepository.findById(id)).thenReturn(Optional.of(existingStore));
        when(storeRepository.save(any(Store.class))).thenReturn(existingStore);
        when(storeMapper.toDto(existingStore)).thenReturn(new StoreDto());

        storeService.updateStore(id, requestDto);

        assertThat(existingStore.getPrice()).isEqualTo(BigDecimal.valueOf(50)); // Remains unchanged
    }

    @Test
    void updateStore_negativePrice_shouldThrowException() {
        Long id = 1L;
        StoreDto requestDto = new StoreDto();
        requestDto.setPrice(BigDecimal.valueOf(-1));

        Store existingStore = new Store();
        when(storeRepository.findById(id)).thenReturn(Optional.of(existingStore));

        assertThatThrownBy(() -> storeService.updateStore(id, requestDto))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteStore_shouldCallRepository() {
        Long id = 1L;
        storeService.deleteStore(id);
        verify(storeRepository).deleteById(id);
    }
}
