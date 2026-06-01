package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.entity.Store;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
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
        return getAllModules(null);
    }

    @Transactional(readOnly = true)
    public List<ModuleDto> getAllModules(ModuleStatusEnum status) {
        List<Module> modules = (status == null) ? moduleRepository.findAll() : moduleRepository.findByStatus(status);
        return modules.stream()
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
    public ModuleDto updateModule(Long id, ModuleDto moduleDto) {
        // 1. On vérifie si le store existe
        Module existingModule = moduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Module non trouvé"));

        // 2. On met à jour les champs
        existingModule.setName(moduleDto.getName());
        existingModule.setCategory(moduleDto.getCategory());
        existingModule.setDescription(moduleDto.getDescription());
        existingModule.setIcon(moduleDto.getIcon());
        existingModule.setStatus(moduleDto.getStatus());
        existingModule.setPrice(moduleDto.getPrice());

        // 3. On sauvegarde
        return moduleMapper.toDto(moduleRepository.save(existingModule));
    }

    public void deleteModule(Long id) {

        moduleRepository.deleteById(id);
    }
}
