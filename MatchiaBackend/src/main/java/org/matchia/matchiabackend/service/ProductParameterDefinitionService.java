package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionDto;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionRequestDto;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.mapper.ProductParameterDefinitionMapper;
import org.matchia.matchiabackend.repository.ProductParameterDefinitionRepository;
import org.matchia.matchiabackend.repository.ProductParameterValueRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductParameterDefinitionService {

    private final ProductParameterDefinitionRepository definitionRepository;
    private final ProductParameterValueRepository valueRepository;
    private final StoreRepository storeRepository;
    private final ProductParameterDefinitionMapper mapper;

    @Transactional(readOnly = true)
    public List<ProductParameterDefinitionDto> getByStore(Long storeId) {
        ensureStoreExists(storeId);
        return definitionRepository.findByStoreIdOrderByNameAsc(storeId)
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductParameterDefinitionDto create(ProductParameterDefinitionRequestDto request) {
        Store store = ensureStoreExists(request.getStoreId());
        String name = normalizeName(request.getName());
        if (definitionRepository.existsByStoreIdAndNameIgnoreCase(store.getId(), name)) {
            throw new IllegalArgumentException("Ce parametre existe deja pour ce store.");
        }

        ProductParameterDefinition entity = mapper.toEntity(request);
        entity.setName(name);
        entity.setStore(store);
        return mapper.toDto(definitionRepository.save(entity));
    }

    @Transactional
    public ProductParameterDefinitionDto update(Long id, ProductParameterDefinitionRequestDto request) {
        ProductParameterDefinition existing = definitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parametre produit introuvable avec l'id : " + id));

        if (request.getStoreId() != null && !request.getStoreId().equals(existing.getStore().getId())) {
            throw new IllegalArgumentException("Le store du parametre ne peut pas etre modifie.");
        }

        String name = normalizeName(request.getName());
        boolean nameAlreadyUsed = definitionRepository.existsByStoreIdAndNameIgnoreCase(existing.getStore().getId(), name)
                && !existing.getName().equalsIgnoreCase(name);
        if (nameAlreadyUsed) {
            throw new IllegalArgumentException("Ce parametre existe deja pour ce store.");
        }

        existing.setName(name);
        return mapper.toDto(definitionRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        ProductParameterDefinition existing = definitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parametre produit introuvable avec l'id : " + id));
        valueRepository.deleteByParameterDefinitionId(existing.getId());
        definitionRepository.delete(existing);
    }

    private Store ensureStoreExists(Long storeId) {
        if (storeId == null) {
            throw new IllegalArgumentException("Le store est obligatoire.");
        }
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store non trouve avec l'id : " + storeId));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Le nom du parametre est obligatoire.");
        }
        return name.trim();
    }
}
