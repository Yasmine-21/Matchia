package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.ModuleStoreRequest;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ModuleStoreResponseDto;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.mapper.ModuleStoreMapper;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.ModuleStoreParameterRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleStoreService {

    private static final Set<String> PARAMETER_TYPES = Set.of("string", "number", "boolean", "date", "select", "image");

    private final ModuleStoreRepository moduleStoreRepository;
    private final ModuleStoreParameterRepository parameterRepository;
    private final ModuleStoreMapper moduleStoreMapper;
    private final StoreRepository storeRepository;
    private final ModuleRepository moduleRepository;

    // ============ RÉCUPÉRATION ============

    // Récupérer TOUS les modules assignés à un store (actifs + inactifs)
    @Transactional(readOnly = true)
    public List<ModuleStoreResponseDto> getModulesByStore(Long storeId) {
        return moduleStoreRepository.findByStoreIdOrderByOrdreAsc(storeId)
                .stream()
                .map(moduleStoreMapper::toDto)
                .collect(Collectors.toList());
    }

    // Récupérer seulement les modules ACTIFS d'un store
    @Transactional(readOnly = true)
    public List<ModuleStoreResponseDto> getActiveModulesByStore(Long storeId) {
        return moduleStoreRepository.findByStoreIdAndActifTrueAndModuleStatusOrderByOrdreAsc(storeId, ModuleStatusEnum.active)
                .stream()
                .map(moduleStoreMapper::toDto)
                .collect(Collectors.toList());
    }

    // Récupérer une assignation spécifique
    @Transactional(readOnly = true)
    public ModuleStoreResponseDto getAssignment(Long storeId, Long moduleId) {
        ModuleStore ms = moduleStoreRepository.findByStoreIdAndModuleId(storeId, moduleId)
                .orElseThrow(() -> new RuntimeException("Assignation non trouvée pour storeId: " + storeId + " et moduleId: " + moduleId));
        return moduleStoreMapper.toDto(ms);
    }

    // ============ CRÉATION / ASSIGNATION ============

    // Assigner un module à un store
    @Transactional
    public ModuleStoreResponseDto assignFullModuleToStore(ModuleStoreRequest request) {

        // 1. récupérer store
        Store store = storeRepository.findById(request.getStore().getId())

                .orElseThrow(() -> new RuntimeException("Store non trouvé"));

        // 2. récupérer module
        Module module = moduleRepository.findById(request.getModule().getId())
                .orElseThrow(() -> new RuntimeException("Module non trouvé"));

        // 3. créer ModuleStore
        ModuleStore moduleStore = new ModuleStore();
        moduleStore.setStore(store);
        moduleStore.setModule(module);
        moduleStore.setActif(request.getActif() != null ? request.getActif() : true);
        moduleStore.setOrdre(request.getOrdre() != null ? request.getOrdre() : 0);
        moduleStore.setPrice(validatePrice(request.getPrice(), "Le prix du module est requis et doit etre superieur ou egal a 0."));

        // 4. gérer paramètres
        if (request.getParameters() != null && !request.getParameters().isEmpty()) {

            List<ModuleStoreParameter> params = request.getParameters()
                    .stream()
                    .map(p -> {
                        ModuleStoreParameter param = new ModuleStoreParameter();
                        param.setCode(p.getCode());
                        param.setName(p.getName());
                        param.setType(p.getType());
                        param.setRequired(p.getRequired());
                        param.setValue(normalizeParameterValue(p.getValue()));
                        param.setOptions(normalizeOptions(p.getOptions()));

                        // IMPORTANT relation bidirectionnelle
                        param.setModuleStore(moduleStore);

                        return param;
                    })
                    .collect(Collectors.toList());

            moduleStore.setParameters(params);
        }

        // 5. sauvegarde (cascade doit exister côté entity)
        ModuleStore saved = moduleStoreRepository.save(moduleStore);

        // 6. mapping DTO (ton mapper existant)
        return moduleStoreMapper.toDto(saved);
    }

    // ============ MISE À JOUR ============

    // Toggle module (activer/désactiver)
    @Transactional
    public ModuleStoreResponseDto toggleModule(Long storeId, Long moduleId, boolean actif) {
        ModuleStore ms = moduleStoreRepository.findByStoreIdAndModuleId(storeId, moduleId)
                .orElseThrow(() -> new RuntimeException("Assignation non trouvée pour storeId: " + storeId + " et moduleId: " + moduleId));
        ms.setActif(actif);
        return moduleStoreMapper.toDto(moduleStoreRepository.save(ms));
    }

    // Mettre à jour l'ordre d'un module
    @Transactional
    public ModuleStoreResponseDto updateOrder(Long storeId, Long moduleId, int ordre) {
        ModuleStore ms = moduleStoreRepository.findByStoreIdAndModuleId(storeId, moduleId)
                .orElseThrow(() -> new RuntimeException("Assignation non trouvée"));
        ms.setOrdre(ordre);
        return moduleStoreMapper.toDto(moduleStoreRepository.save(ms));
    }

    // Mettre à jour un module store par ID
    @Transactional
    public ModuleStoreResponseDto updateModuleStore(Long id, ModuleStore details) {
        ModuleStore ms = moduleStoreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ModuleStore non trouvé avec l'id : " + id));
        ms.setActif(details.getActif());
        ms.setOrdre(details.getOrdre());
        if (details.getPrice() != null) {
            ms.setPrice(validatePrice(details.getPrice(), "Le prix du module doit etre superieur ou egal a 0."));
        }
        return moduleStoreMapper.toDto(moduleStoreRepository.save(ms));
    }

    @Transactional
    public ModuleStoreResponseDto updateModuleStorePrice(Long moduleStoreId, BigDecimal price) {
        ModuleStore ms = moduleStoreRepository.findById(moduleStoreId)
                .orElseThrow(() -> new RuntimeException("ModuleStore non trouve avec l'id : " + moduleStoreId));
        ms.setPrice(validatePrice(price, "Le prix du module est requis et doit etre superieur ou egal a 0."));
        return moduleStoreMapper.toDto(moduleStoreRepository.save(ms));
    }

    // ============ SUPPRESSION ============

    // Supprimer une assignation par ID
    @Transactional
    public void deleteModuleStore(Long id) {
        if (!moduleStoreRepository.existsById(id)) {
            throw new RuntimeException("ModuleStore non trouvé avec l'id : " + id);
        }
        moduleStoreRepository.deleteById(id);
    }

    // Supprimer une assignation par storeId et moduleId
    @Transactional
    public void deleteAssignment(Long storeId, Long moduleId) {
        if (!moduleStoreRepository.existsByStoreIdAndModuleId(storeId, moduleId)) {
            throw new RuntimeException("Assignation non trouvée pour storeId: " + storeId + " et moduleId: " + moduleId);
        }
        moduleStoreRepository.deleteByStoreIdAndModuleId(storeId, moduleId);
    }

    // ============ PARAMÈTRES ============

    // Ajouter un paramètre à un module assigné
    @Transactional
    public ModuleStoreResponseDto addParameterToModule(Long moduleStoreId, ModuleStoreParameter param) {
        ModuleStore ms = moduleStoreRepository.findById(moduleStoreId)
                .orElseThrow(() -> new RuntimeException("ModuleStore non trouvé avec l'id : " + moduleStoreId));
        validateParameter(param);
        param.setValue(normalizeParameterValue(param.getValue()));
        param.setOptions(normalizeOptions(param.getOptions()));
        param.setModuleStore(ms);
        ModuleStoreParameter savedParam = parameterRepository.save(param);
        ms.getParameters().add(savedParam);
        return moduleStoreMapper.toDto(ms);
    }


    // Récupérer les paramètres d'un module assigné
    @Transactional(readOnly = true)
    public List<ModuleStoreParameter> getParameters(Long moduleStoreId) {
        ModuleStore ms = moduleStoreRepository.findById(moduleStoreId)
                .orElseThrow(() -> new RuntimeException("ModuleStore non trouvé avec l'id : " + moduleStoreId));
        return ms.getParameters();
    }

    // Modifier un paramètre spécifique
    @Transactional
    public ModuleStoreResponseDto updateParameter(Long parameterId, ModuleStoreParameter details) {
        ModuleStoreParameter param = parameterRepository.findById(parameterId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'id : " + parameterId));
        validateParameter(details);

        param.setName(details.getName());
        param.setCode(details.getCode());
        param.setType(details.getType());
        param.setRequired(details.getRequired());
        param.setValue(normalizeParameterValue(details.getValue()));
        param.setOptions(normalizeOptions(details.getOptions()));
        parameterRepository.save(param);
        return moduleStoreMapper.toDto(param.getModuleStore());
    }

    // Supprimer un paramètre spécifique
    @Transactional
    public ModuleStoreResponseDto deleteParameter(Long parameterId) {
        ModuleStoreParameter param = parameterRepository.findById(parameterId)
                .orElseThrow(() -> new RuntimeException("Paramètre non trouvé avec l'id : " + parameterId));
        ModuleStore ms = param.getModuleStore();
        parameterRepository.delete(param);
        ms.getParameters().remove(param);
        return moduleStoreMapper.toDto(ms);
    }


    // Compter le nombre de modules assignés à un store
    @Transactional(readOnly = true)
    public long countModulesByStore(Long storeId) {
        return moduleStoreRepository.countByStoreId(storeId);
    }

    private BigDecimal validatePrice(BigDecimal price, String message) {
        if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(message);
        }
        return price;
    }

    private void validateParameter(ModuleStoreParameter parameter) {
        if (parameter == null || !hasText(parameter.getName()) || !hasText(parameter.getCode())) {
            throw new IllegalArgumentException("Le nom et le code du parametre sont obligatoires.");
        }
        if (!hasText(parameter.getType()) || !PARAMETER_TYPES.contains(parameter.getType())) {
            throw new IllegalArgumentException("Le type du parametre est invalide.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeParameterValue(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeOptions(String options) {
        if (options == null) {
            return null;
        }

        String normalized = options
                .lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .collect(Collectors.joining(","));
        return normalized.isBlank() ? null : normalized;
    }
}
