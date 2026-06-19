package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ProductDto;
import org.matchia.matchiabackend.dto.ProductParameterValueRequestDto;
import org.matchia.matchiabackend.dto.ProductRequestDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.matchia.matchiabackend.entity.ProductParameterValue;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.mapper.ProductMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ProductParameterDefinitionRepository;
import org.matchia.matchiabackend.repository.ProductRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductParameterDefinitionRepository definitionRepository;
    private final BankRepository bankRepository;
    private final StoreRepository storeRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final ProductMapper mapper;

    @Transactional(readOnly = true)
    public List<ProductDto> getByBank(Long bankId) {
        ensureBankExists(bankId);
        return productRepository.findByBank_IdOrderByCreatedAtDesc(bankId)
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDto> getByStore(Long storeId) {
        ensureStoreExists(storeId);
        return productRepository.findByStore_IdOrderByCreatedAtDesc(storeId)
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDto getById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable avec l'id : " + id));
        return mapper.toDto(product);
    }

    @Transactional
    public ProductDto create(ProductRequestDto request) {
        Product product = new Product();
        applyRequest(request, product);
        return mapper.toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductRequestDto request) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable avec l'id : " + id));
        applyRequest(request, existing);
        return mapper.toDto(productRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Produit introuvable avec l'id : " + id);
        }
        productRepository.deleteById(id);
    }

    private void applyRequest(ProductRequestDto request, Product product) {
        if (request == null) {
            throw new IllegalArgumentException("Les donnees du produit sont obligatoires.");
        }

        Bank bank = ensureBankExists(request.getBankId());
        Store store = ensureStoreExists(request.getStoreId());
        ensureStoreBelongsToBank(bank.getId(), store.getId());

        String name = normalizeText(request.getName(), "Le nom du produit est obligatoire.");
        product.setBank(bank);
        product.setStore(store);
        product.setName(name);
        product.setDescription(request.getDescription());

        List<ProductParameterDefinition> definitions = definitionRepository.findByStoreIdOrderByNameAsc(store.getId());
        List<ProductParameterValueRequestDto> submittedValues = request.getParameterValues() != null
                ? request.getParameterValues()
                : new ArrayList<>();

        if (definitions.isEmpty()) {
            if (!submittedValues.isEmpty()) {
                throw new IllegalArgumentException("Aucun parametre n'est configure pour ce store.");
            }
            product.setParameterValues(new ArrayList<>());
            return;
        }

        Map<Long, ProductParameterValueRequestDto> submittedByDefinitionId = new LinkedHashMap<>();
        for (ProductParameterValueRequestDto valueRequest : submittedValues) {
            if (valueRequest == null || valueRequest.getParameterDefinitionId() == null) {
                throw new IllegalArgumentException("Chaque valeur de parametre doit contenir un parameterDefinitionId.");
            }
            if (submittedByDefinitionId.containsKey(valueRequest.getParameterDefinitionId())) {
                throw new IllegalArgumentException("Chaque parametre doit etre fourni une seule fois.");
            }
            submittedByDefinitionId.put(valueRequest.getParameterDefinitionId(), valueRequest);
        }

        Set<Long> definitionIds = definitions.stream()
                .map(ProductParameterDefinition::getId)
                .collect(Collectors.toSet());

        if (!definitionIds.equals(submittedByDefinitionId.keySet())) {
            throw new IllegalArgumentException("Les valeurs fournies doivent correspondre exactement aux parametres du store selectionne.");
        }

        List<ProductParameterValue> values = new ArrayList<>();
        for (ProductParameterDefinition definition : definitions) {
            ProductParameterValueRequestDto valueRequest = submittedByDefinitionId.get(definition.getId());
            ProductParameterValue value = new ProductParameterValue();
            value.setProduct(product);
            value.setParameterDefinition(definition);
            value.setValue(valueRequest != null ? valueRequest.getValue() : null);
            values.add(value);
        }
        product.setParameterValues(values);
    }

    private Bank ensureBankExists(Long bankId) {
        if (bankId == null) {
            throw new IllegalArgumentException("La banque est obligatoire.");
        }
        return bankRepository.findById(bankId)
                .orElseThrow(() -> new RuntimeException("Banque introuvable avec l'id : " + bankId));
    }

    private Store ensureStoreExists(Long storeId) {
        if (storeId == null) {
            throw new IllegalArgumentException("Le store est obligatoire.");
        }
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store introuvable avec l'id : " + storeId));
    }

    private void ensureStoreBelongsToBank(Long bankId, Long storeId) {
        if (marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(bankId, storeId).isEmpty()) {
            throw new IllegalArgumentException("Le store selectionne n'appartient pas a la banque choisie.");
        }
    }

    private String normalizeText(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(errorMessage);
        }
        return value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
