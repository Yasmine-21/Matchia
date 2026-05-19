package org.matchia.matchiabackend.service;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.mapper.ModuleMapper;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final ModuleMapper moduleMapper;

    // LIRE TOUT
    @Transactional(readOnly = true)
    public List<ModuleDto> getAllModules() {
        return moduleRepository.findAll().stream()
                .map(moduleMapper::toDto)
                .collect(Collectors.toList());
    }

    // LIRE UN SEUL
    @Transactional(readOnly = true)
    public ModuleDto getModuleById(Long id) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Module non trouvé avec l'id : " + id));
        return moduleMapper.toDto(module);
    }

    // CRÉER
    @Transactional
    public ModuleDto createModule(ModuleDto dto) {
        Module module = moduleMapper.toEntity(dto);
        return moduleMapper.toDto(moduleRepository.save(module));
    }

    // METTRE À JOUR
    @Transactional
    public ModuleDto updateModule(Long id, ModuleDto dto) {
        Module existingModule = moduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Module non trouvé avec l'id : " + id));

        existingModule.setName(dto.getName());
        existingModule.setStatus(dto.getStatus());

        return moduleMapper.toDto(moduleRepository.save(existingModule));
    }

    // SUPPRIMER
    @Transactional
    public void deleteModule(Long id) {
        if (!moduleRepository.existsById(id)) {
            throw new RuntimeException("Impossible de supprimer : Module non trouvé");
        }
        moduleRepository.deleteById(id);
    }
}