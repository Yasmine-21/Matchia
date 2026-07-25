package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.mapper.ModuleMapper;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ModuleServiceTest {

    @Test
    void globalDeactivationDisablesEveryModuleStoreAssignment() {
        ModuleRepository moduleRepository = mock(ModuleRepository.class);
        ModuleStoreRepository moduleStoreRepository = mock(ModuleStoreRepository.class);
        Module existingModule = module(21L, ModuleStatusEnum.active);
        when(moduleRepository.findById(21L)).thenReturn(Optional.of(existingModule));
        when(moduleRepository.save(any(Module.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ModuleService service = new ModuleService(moduleRepository, moduleStoreRepository, new ModuleMapper());
        ModuleDto update = dto(ModuleStatusEnum.inactive);

        ModuleDto result = service.updateModule(21L, update);

        assertEquals(ModuleStatusEnum.inactive, result.getStatus());
        verify(moduleStoreRepository).deactivateAssignmentsByModuleId(21L);
    }

    @Test
    void globalReactivationDoesNotReactivateStoreAssignments() {
        ModuleRepository moduleRepository = mock(ModuleRepository.class);
        ModuleStoreRepository moduleStoreRepository = mock(ModuleStoreRepository.class);
        Module existingModule = module(21L, ModuleStatusEnum.inactive);
        when(moduleRepository.findById(21L)).thenReturn(Optional.of(existingModule));
        when(moduleRepository.save(any(Module.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ModuleService service = new ModuleService(moduleRepository, moduleStoreRepository, new ModuleMapper());
        service.updateModule(21L, dto(ModuleStatusEnum.active));

        verify(moduleStoreRepository, never()).deactivateAssignmentsByModuleId(21L);
    }

    private Module module(Long id, ModuleStatusEnum status) {
        Module module = new Module();
        module.setId(id);
        module.setName("calculator");
        module.setStatus(status);
        return module;
    }

    private ModuleDto dto(ModuleStatusEnum status) {
        ModuleDto dto = new ModuleDto();
        dto.setName("calculator");
        dto.setStatus(status);
        return dto;
    }
}
