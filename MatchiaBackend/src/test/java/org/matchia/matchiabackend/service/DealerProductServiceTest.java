package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.DealerProduct;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.repository.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DealerProductServiceTest {

    @Mock private DealerProductRepository productRepository;
    @Mock private ProductPublicationRequestRepository publicationRepository;
    @Mock private PartnershipContractRepository contractRepository;
    @Mock private DealerBankPartnershipRepository partnershipRepository;
    @Mock private ProductParameterDefinitionRepository definitionRepository;
    @Mock private MarketplaceRepository marketplaceRepository;
    @Mock private DealerSecurityService security;
    @Mock private DealerAccountService accountService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private AuditLogger auditLogger;
    @Mock private Authentication authentication;

    @InjectMocks
    private DealerProductService dealerProductService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(dealerProductService, "uploadDirectory", "target/test-uploads/dealer-products");
    }

    @Test
    void mine_success() {
        User user = new User();
        Dealer dealer = new Dealer();
        dealer.setId(1L);
        user.setDealer(dealer);
        when(security.requireDealer(authentication)).thenReturn(user);

        DealerProduct product = new DealerProduct();
        product.setId(1L);
        product.setDealer(dealer);
        Store store = new Store();
        store.setId(1L);
        product.setStore(store);

        when(productRepository.findByDealerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(product));

        List<DealerDtos.ProductView> result = dealerProductService.mine(authentication);

        assertThat(result).hasSize(1);
    }
    
    @Test
    void create_success() {
        User user = new User();
        Dealer dealer = new Dealer();
        dealer.setId(1L);
        Store store = new Store();
        store.setId(1L);
        dealer.setStore(store);
        user.setDealer(dealer);
        when(security.requireDealer(authentication)).thenReturn(user);

        DealerDtos.ProductUpsert input = new DealerDtos.ProductUpsert(
                1L, "Name", "Desc", BigDecimal.ONE, "Conditions", null, null
        );
        MockMultipartFile image = new MockMultipartFile("image", "image.png", "image/png", "data".getBytes());

        DealerProduct savedProduct = new DealerProduct();
        savedProduct.setId(1L);
        savedProduct.setDealer(dealer);
        savedProduct.setStore(store);

        when(productRepository.save(any())).thenReturn(savedProduct);
        when(productRepository.findByIdAndDealerId(1L, 1L)).thenReturn(Optional.of(savedProduct));

        DealerDtos.ProductView result = dealerProductService.create(authentication, input, image);

        assertThat(result).isNotNull();
        verify(productRepository).save(any(DealerProduct.class));
    }
}
