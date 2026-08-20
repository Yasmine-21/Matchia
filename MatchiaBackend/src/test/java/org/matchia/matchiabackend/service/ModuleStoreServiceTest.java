package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ModuleStoreRequest;
import org.matchia.matchiabackend.dto.ModuleStoreResponseDto;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.mapper.ModuleStoreMapper;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.ModuleStoreParameterRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModuleStoreServiceTest {

    @Mock
    private ModuleStoreRepository moduleStoreRepository;
    @Mock
    private ModuleStoreParameterRepository parameterRepository;
    @Mock
    private ModuleStoreMapper moduleStoreMapper;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private ModuleRepository moduleRepository;

    @InjectMocks
    private ModuleStoreService moduleStoreService;

    @Test
    void getModulesByStore_success() {
        when(moduleStoreRepository.findByStoreIdOrderByOrdreAsc(1L)).thenReturn(List.of(new ModuleStore()));
        when(moduleStoreMapper.toDto(any())).thenReturn(new ModuleStoreResponseDto());

        List<ModuleStoreResponseDto> result = moduleStoreService.getModulesByStore(1L);

        assertThat(result).hasSize(1);
    }

    @Test
    void assignFullModuleToStore_success() {
        ModuleStoreRequest request = new ModuleStoreRequest();
        StoreDto storeDto = new StoreDto();
        storeDto.setId(1L);
        ModuleDto moduleDto = new ModuleDto();
        moduleDto.setId(2L);
        request.setStore(storeDto);
        request.setModule(moduleDto);
        request.setPrice(BigDecimal.valueOf(10));

        Store store = new Store();
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        Module module = new Module();
        module.setStatus(ModuleStatusEnum.active);
        when(moduleRepository.findById(2L)).thenReturn(Optional.of(module));

        when(moduleStoreRepository.save(any())).thenReturn(new ModuleStore());
        when(moduleStoreMapper.toDto(any())).thenReturn(new ModuleStoreResponseDto());

        ModuleStoreResponseDto result = moduleStoreService.assignFullModuleToStore(request);

        assertThat(result).isNotNull();
        verify(moduleStoreRepository).save(any(ModuleStore.class));
    }

    @Test
    void toggleModule_success() {
        ModuleStore ms = new ModuleStore();
        ms.setActif(false);
        when(moduleStoreRepository.findByStoreIdAndModuleId(1L, 2L)).thenReturn(Optional.of(ms));
        when(moduleStoreRepository.save(any())).thenReturn(ms);
        when(moduleStoreMapper.toDto(any())).thenReturn(new ModuleStoreResponseDto());

        ModuleStoreResponseDto result = moduleStoreService.toggleModule(1L, 2L, true);

        assertThat(result).isNotNull();
        verify(moduleStoreRepository).save(ms);
    }

    @Test
    void toggleModule_inactiveGlobalModule_throwsException() {
        ModuleStore ms = new ModuleStore();
        Module module = new Module();
        module.setStatus(ModuleStatusEnum.inactive);
        ms.setModule(module);
        
        when(moduleStoreRepository.findByStoreIdAndModuleId(1L, 2L)).thenReturn(Optional.of(ms));

        assertThatThrownBy(() -> moduleStoreService.toggleModule(1L, 2L, true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteModuleStore_success() {
        when(moduleStoreRepository.existsById(1L)).thenReturn(true);
        moduleStoreService.deleteModuleStore(1L);
        verify(moduleStoreRepository).deleteById(1L);
    }

    @Test
    void managesOrdersPricesAssignmentsAndParameters() {
        Module module = new Module(); module.setStatus(ModuleStatusEnum.active);
        ModuleStore assignment = new ModuleStore(); assignment.setModule(module); assignment.setParameters(new java.util.ArrayList<>());
        ModuleStoreResponseDto dto = new ModuleStoreResponseDto();
        when(moduleStoreRepository.findByStoreIdAndModuleId(1L, 2L)).thenReturn(Optional.of(assignment));
        when(moduleStoreRepository.findById(3L)).thenReturn(Optional.of(assignment));
        when(moduleStoreRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(moduleStoreMapper.toDto(any())).thenReturn(dto);
        when(moduleStoreRepository.countByStoreId(1L)).thenReturn(2L);
        when(moduleStoreRepository.existsByStoreIdAndModuleId(1L, 2L)).thenReturn(true);

        assertThat(moduleStoreService.getActiveModulesByStore(1L)).isEmpty();
        assertThat(moduleStoreService.updateOrder(1L, 2L, 4)).isSameAs(dto);
        assertThat(moduleStoreService.updateModuleStorePrice(3L, BigDecimal.TEN)).isSameAs(dto);
        assertThat(moduleStoreService.countModulesByStore(1L)).isEqualTo(2L);
        moduleStoreService.deleteAssignment(1L, 2L);

        ModuleStoreParameter parameter = new ModuleStoreParameter(); parameter.setName("Color"); parameter.setCode("color"); parameter.setType("select"); parameter.setValue(" blue "); parameter.setOptions("red\n blue\n");
        when(parameterRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(moduleStoreService.addParameterToModule(3L, parameter)).isSameAs(dto);
        assertThat(parameter.getValue()).isEqualTo("blue");
        assertThat(parameter.getOptions()).isEqualTo("red,blue");
        verify(moduleStoreRepository).deleteByStoreIdAndModuleId(1L, 2L);
    }
}
