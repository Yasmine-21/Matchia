package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionDto;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionRequestDto;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.mapper.ProductParameterDefinitionMapper;
import org.matchia.matchiabackend.repository.ProductParameterDefinitionRepository;
import org.matchia.matchiabackend.repository.ProductParameterValueRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductParameterDefinitionServiceTest {

    @Mock
    private ProductParameterDefinitionRepository definitionRepository;
    @Mock
    private ProductParameterValueRepository valueRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private ProductParameterDefinitionMapper mapper;

    @InjectMocks
    private ProductParameterDefinitionService productParameterDefinitionService;

    @Test
    void getByStore_success() {
        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        ProductParameterDefinition def = new ProductParameterDefinition();
        when(definitionRepository.findByStoreIdOrderByNameAsc(1L)).thenReturn(List.of(def));
        when(mapper.toDto(def)).thenReturn(new ProductParameterDefinitionDto());

        List<ProductParameterDefinitionDto> result = productParameterDefinitionService.getByStore(1L);

        assertThat(result).hasSize(1);
    }

    @Test
    void create_success() {
        ProductParameterDefinitionRequestDto request = new ProductParameterDefinitionRequestDto();
        request.setStoreId(1L);
        request.setName("Name");

        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(definitionRepository.existsByStoreIdAndNameIgnoreCase(1L, "Name")).thenReturn(false);
        
        ProductParameterDefinition entity = new ProductParameterDefinition();
        when(mapper.toEntity(request)).thenReturn(entity);
        when(definitionRepository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(new ProductParameterDefinitionDto());

        ProductParameterDefinitionDto result = productParameterDefinitionService.create(request);

        assertThat(result).isNotNull();
    }
    
    @Test
    void create_duplicateName_throwsException() {
        ProductParameterDefinitionRequestDto request = new ProductParameterDefinitionRequestDto();
        request.setStoreId(1L);
        request.setName("Name");

        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(definitionRepository.existsByStoreIdAndNameIgnoreCase(1L, "Name")).thenReturn(true);

        assertThatThrownBy(() -> productParameterDefinitionService.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("existe deja");
    }

    @Test
    void update_success() {
        ProductParameterDefinitionRequestDto request = new ProductParameterDefinitionRequestDto();
        request.setStoreId(1L);
        request.setName("New Name");

        Store store = new Store();
        store.setId(1L);
        ProductParameterDefinition existing = new ProductParameterDefinition();
        existing.setId(1L);
        existing.setStore(store);
        existing.setName("Old Name");

        when(definitionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(definitionRepository.existsByStoreIdAndNameIgnoreCase(1L, "New Name")).thenReturn(false);
        when(definitionRepository.save(existing)).thenReturn(existing);
        when(mapper.toDto(existing)).thenReturn(new ProductParameterDefinitionDto());

        ProductParameterDefinitionDto result = productParameterDefinitionService.update(1L, request);

        assertThat(result).isNotNull();
        assertThat(existing.getName()).isEqualTo("New Name");
    }

    @Test
    void delete_success() {
        ProductParameterDefinition existing = new ProductParameterDefinition();
        existing.setId(1L);
        when(definitionRepository.findById(1L)).thenReturn(Optional.of(existing));

        productParameterDefinitionService.delete(1L);

        verify(valueRepository).deleteByParameterDefinitionId(1L);
        verify(definitionRepository).delete(existing);
    }
}
