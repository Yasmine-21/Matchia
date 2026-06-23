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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductParameterDefinitionRepository definitionRepository;
    private final BankRepository bankRepository;
    private final StoreRepository storeRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final ProductMapper mapper;

    @Value("${app.product.upload.dir:uploads/products}")
    private String productUploadDir;

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
        applyRequest(request, product, null);
        return mapper.toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductRequestDto request) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable avec l'id : " + id));
        applyRequest(request, existing, null);
        return mapper.toDto(productRepository.save(existing));
    }

    @Transactional
    public ProductDto create(ProductRequestDto request, MultipartFile image) {
        Product product = new Product();
        applyRequest(request, product, image);
        return mapper.toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductRequestDto request, MultipartFile image) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable avec l'id : " + id));
        applyRequest(request, existing, image);
        return mapper.toDto(productRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Produit introuvable avec l'id : " + id);
        }
        productRepository.deleteById(id);
    }

    private void applyRequest(ProductRequestDto request, Product product, MultipartFile image) {
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
        product.setPrice(validatePrice(request.getPrice()));

        String uploadedImage = saveImage(image);
        if (uploadedImage != null) {
            product.setImageUrl(uploadedImage);
        } else if (hasText(request.getImageUrl())) {
            product.setImageUrl(request.getImageUrl().trim());
        }

        List<ProductParameterDefinition> definitions = definitionRepository.findByStoreIdOrderByNameAsc(store.getId());
        List<ProductParameterValueRequestDto> submittedValues = request.getParameterValues() != null
                ? request.getParameterValues()
                : new ArrayList<>();

        if (definitions.isEmpty()) {
            if (!submittedValues.isEmpty()) {
                throw new IllegalArgumentException("Aucun parametre n'est configure pour ce store.");
            }
            replaceParameterValues(product, new ArrayList<>());
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

        List<ProductParameterValue> values = syncParameterValues(product, definitions, submittedByDefinitionId);
        replaceParameterValues(product, values);
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

    private String saveImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("L'image du produit doit etre une image.");
        }

        try {
            String original = image.getOriginalFilename();
            String extension = original != null && original.contains(".")
                    ? original.substring(original.lastIndexOf("."))
                    : "";
            String filename = UUID.randomUUID() + extension;
            Path dir = Paths.get(productUploadDir);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
            Files.copy(image.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/products/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'upload de l'image du produit.", e);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void replaceParameterValues(Product product, List<ProductParameterValue> values) {
        if (product.getParameterValues() != null) {
            product.getParameterValues().clear();
        }
        if (product.getParameterValues() == null) {
            product.setParameterValues(new ArrayList<>());
        }
        product.getParameterValues().addAll(values);
    }

    private List<ProductParameterValue> syncParameterValues(
            Product product,
            List<ProductParameterDefinition> definitions,
            Map<Long, ProductParameterValueRequestDto> submittedByDefinitionId
    ) {
        Map<Long, ProductParameterValue> existingByDefinitionId = new LinkedHashMap<>();
        if (product.getParameterValues() != null) {
            for (ProductParameterValue existingValue : product.getParameterValues()) {
                if (existingValue != null
                        && existingValue.getParameterDefinition() != null
                        && existingValue.getParameterDefinition().getId() != null) {
                    existingByDefinitionId.put(existingValue.getParameterDefinition().getId(), existingValue);
                }
            }
        }

        List<ProductParameterValue> synchronizedValues = new ArrayList<>();
        for (ProductParameterDefinition definition : definitions) {
            ProductParameterValue value = existingByDefinitionId.remove(definition.getId());
            if (value == null) {
                value = new ProductParameterValue();
            }
            ProductParameterValueRequestDto valueRequest = submittedByDefinitionId.get(definition.getId());
            value.setProduct(product);
            value.setParameterDefinition(definition);
            value.setValue(valueRequest != null ? valueRequest.getValue() : null);
            synchronizedValues.add(value);
        }

        return synchronizedValues;
    }

    private BigDecimal validatePrice(BigDecimal price) {
        if (price == null) {
            return null;
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Le prix du produit doit etre superieur ou egal a 0.");
        }
        return price;
    }
}
