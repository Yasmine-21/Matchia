package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ProductDto;
import org.matchia.matchiabackend.dto.ProductParameterValueRequestDto;
import org.matchia.matchiabackend.dto.ProductRequestDto;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.mapper.ProductMapper;
import org.matchia.matchiabackend.repository.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductParameterDefinitionRepository definitionRepository;
    @Mock
    private BankRepository bankRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock
    private ProductMapper mapper;

    @InjectMocks
    private ProductService productService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(productService, "productUploadDir", "target/test-uploads/products");
    }

    private Bank createBank(Long id) {
        Bank bank = new Bank();
        bank.setId(id);
        return bank;
    }

    private Store createStore(Long id) {
        Store store = new Store();
        store.setId(id);
        return store;
    }

    @Test
    void getByBank_success() {
        Long bankId = 1L;
        when(bankRepository.findById(bankId)).thenReturn(Optional.of(createBank(bankId)));
        
        Product product = new Product();
        ProductDto dto = new ProductDto();
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(bankId)).thenReturn(List.of(product));
        when(mapper.toDto(product)).thenReturn(dto);

        List<ProductDto> result = productService.getByBank(bankId);

        assertThat(result).hasSize(1);
    }

    @Test
    void getByBank_bankNotFound_throwsException() {
        when(bankRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getByBank(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Banque introuvable");
    }

    @Test
    void getByStore_success() {
        Long storeId = 1L;
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(createStore(storeId)));

        Product product = new Product();
        ProductDto dto = new ProductDto();
        when(productRepository.findByStore_IdOrderByCreatedAtDesc(storeId)).thenReturn(List.of(product));
        when(mapper.toDto(product)).thenReturn(dto);

        List<ProductDto> result = productService.getByStore(storeId);

        assertThat(result).hasSize(1);
    }

    @Test
    void getById_success() {
        Long id = 1L;
        Product product = new Product();
        ProductDto dto = new ProductDto();
        when(productRepository.findById(id)).thenReturn(Optional.of(product));
        when(mapper.toDto(product)).thenReturn(dto);

        ProductDto result = productService.getById(id);

        assertThat(result).isNotNull();
    }

    @Test
    void getById_notFound_throwsException() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getById(1L))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void delete_success() {
        when(productRepository.existsById(1L)).thenReturn(true);
        productService.delete(1L);
        verify(productRepository).deleteById(1L);
    }

    @Test
    void delete_notFound_throwsException() {
        when(productRepository.existsById(1L)).thenReturn(false);
        assertThatThrownBy(() -> productService.delete(1L))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void create_successWithoutImage() {
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(1L);
        request.setStoreId(2L);
        request.setName("Product Name");
        request.setPrice(BigDecimal.valueOf(100));

        when(bankRepository.findById(1L)).thenReturn(Optional.of(createBank(1L)));
        when(storeRepository.findById(2L)).thenReturn(Optional.of(createStore(2L)));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 2L)).thenReturn(Optional.of(new MarketplaceStore()));
        when(definitionRepository.findByStoreIdOrderByNameAsc(2L)).thenReturn(new ArrayList<>());
        
        Product savedProduct = new Product();
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);
        when(mapper.toDto(savedProduct)).thenReturn(new ProductDto());

        ProductDto result = productService.create(request);
        assertThat(result).isNotNull();
    }

    @Test
    void create_withInvalidPrice_throwsException() {
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(1L);
        request.setStoreId(2L);
        request.setName("Product Name");
        request.setPrice(BigDecimal.valueOf(-1));

        when(bankRepository.findById(1L)).thenReturn(Optional.of(createBank(1L)));
        when(storeRepository.findById(2L)).thenReturn(Optional.of(createStore(2L)));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 2L)).thenReturn(Optional.of(new MarketplaceStore()));

        assertThatThrownBy(() -> productService.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Le prix du produit doit etre superieur");
    }

    @Test
    void update_successWithImage() {
        Long id = 1L;
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(1L);
        request.setStoreId(2L);
        request.setName("Updated Name");

        Product existingProduct = new Product();
        when(productRepository.findById(id)).thenReturn(Optional.of(existingProduct));
        when(bankRepository.findById(1L)).thenReturn(Optional.of(createBank(1L)));
        when(storeRepository.findById(2L)).thenReturn(Optional.of(createStore(2L)));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 2L)).thenReturn(Optional.of(new MarketplaceStore()));
        when(definitionRepository.findByStoreIdOrderByNameAsc(2L)).thenReturn(new ArrayList<>());
        
        when(productRepository.save(any(Product.class))).thenReturn(existingProduct);
        when(mapper.toDto(existingProduct)).thenReturn(new ProductDto());

        MockMultipartFile image = new MockMultipartFile("image", "test.png", "image/png", "test image content".getBytes());

        ProductDto result = productService.update(id, request, image);
        assertThat(result).isNotNull();
        verify(productRepository).save(existingProduct);
    }
    
    @Test
    void update_invalidImageContentType_throwsException() {
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(1L);
        request.setStoreId(2L);
        request.setName("Updated Name");

        Product existingProduct = new Product();
        when(productRepository.findById(1L)).thenReturn(Optional.of(existingProduct));
        when(bankRepository.findById(1L)).thenReturn(Optional.of(createBank(1L)));
        when(storeRepository.findById(2L)).thenReturn(Optional.of(createStore(2L)));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 2L)).thenReturn(Optional.of(new MarketplaceStore()));

        MockMultipartFile invalidImage = new MockMultipartFile("image", "test.txt", "text/plain", "text".getBytes());

        assertThatThrownBy(() -> productService.update(1L, request, invalidImage))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createsProductWithStoreParameterValues() {
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(1L); request.setStoreId(2L); request.setName("Car"); request.setPrice(BigDecimal.valueOf(100));
        ProductParameterValueRequestDto value = new ProductParameterValueRequestDto(); value.setParameterDefinitionId(9L); value.setValue("Blue");
        request.setParameterValues(List.of(value));
        ProductParameterDefinition definition = new ProductParameterDefinition(); definition.setId(9L); definition.setName("Color");
        when(bankRepository.findById(1L)).thenReturn(Optional.of(createBank(1L)));
        when(storeRepository.findById(2L)).thenReturn(Optional.of(createStore(2L)));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 2L)).thenReturn(Optional.of(new MarketplaceStore()));
        when(definitionRepository.findByStoreIdOrderByNameAsc(2L)).thenReturn(List.of(definition));
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));
        when(mapper.toDto(any(Product.class))).thenReturn(new ProductDto());

        productService.create(request);

        var product = org.mockito.ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(product.capture());
        assertThat(product.getValue().getParameterValues()).singleElement().satisfies(item -> {
            assertThat(item.getParameterDefinition()).isSameAs(definition);
            assertThat(item.getValue()).isEqualTo("Blue");
        });
    }
}
