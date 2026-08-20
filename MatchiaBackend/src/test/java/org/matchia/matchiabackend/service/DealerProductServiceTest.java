package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.DealerProduct;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.ProductPublicationRequest;
import org.matchia.matchiabackend.entity.enums.DealerProductStatusEnum;
import org.matchia.matchiabackend.entity.enums.ProductPublicationStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
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
import static org.mockito.ArgumentMatchers.eq;
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

    @Test
    void bankApprovesPublicationAndNotifiesDealer() {
        Bank bank = new Bank(); bank.setId(3L); bank.setName("Bank");
        Marketplace marketplace = new Marketplace(); marketplace.setId(4L);
        Store store = new Store(); store.setId(7L); store.setName("Auto");
        Dealer dealer = new Dealer(); dealer.setId(11L); dealer.setCompanyName("Dealer"); dealer.setStore(store);
        User bankAdmin = new User(); bankAdmin.setRole(RoleEnum.ADMIN_BANK); bankAdmin.setBank(bank);
        User dealerAdmin = new User(); dealerAdmin.setId(5L); dealerAdmin.setEmail("dealer@matchia.com");
        DealerProduct product = new DealerProduct(); product.setId(6L); product.setDealer(dealer); product.setStore(store); product.setName("Car"); product.setStatus(DealerProductStatusEnum.ACTIVE);
        ProductPublicationRequest publication = new ProductPublicationRequest(); publication.setId(7L); publication.setBank(bank); publication.setDealer(dealer); publication.setProduct(product); publication.setStore(store); publication.setMarketplace(marketplace);
        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(publicationRepository.findById(7L)).thenReturn(Optional.of(publication));
        when(publicationRepository.save(any(ProductPublicationRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(11L, RoleEnum.DEALER_ADMIN)).thenReturn(Optional.of(dealerAdmin));

        DealerDtos.PublicationView result = dealerProductService.decide(authentication, 7L, ProductPublicationStatusEnum.APPROVED, null);

        assertThat(result.status()).isEqualTo(ProductPublicationStatusEnum.APPROVED);
        assertThat(publication.getActive()).isTrue();
        verify(notificationService).createNotification(any(), any(), any(), any(), eq(7L), eq(5L));
        verify(emailService).sendDealerEventEmail(eq("dealer@matchia.com"), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void exposesOnlyProductsWithAnActivePublicationAndContract() {
        Bank bank = new Bank(); bank.setId(3L);
        Marketplace marketplace = new Marketplace(); marketplace.setId(4L); marketplace.setStatus(org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum.active);
        Store store = new Store(); store.setId(7L); store.setName("Auto");
        Dealer dealer = new Dealer(); dealer.setId(11L); dealer.setCompanyName("Dealer"); dealer.setStatus(org.matchia.matchiabackend.entity.enums.DealerStatusEnum.ACTIVE); dealer.setStore(store);
        DealerProduct product = new DealerProduct(); product.setId(6L); product.setDealer(dealer); product.setStore(store); product.setName("Car"); product.setStatus(DealerProductStatusEnum.ACTIVE);
        org.matchia.matchiabackend.entity.DealerBankPartnership partnership = new org.matchia.matchiabackend.entity.DealerBankPartnership(); partnership.setId(8L); partnership.setStatus(org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum.ACTIVE);
        ProductPublicationRequest publication = new ProductPublicationRequest(); publication.setProduct(product); publication.setDealer(dealer); publication.setStore(store); publication.setPartnership(partnership);
        when(marketplaceRepository.findByBank_Slug("bank")).thenReturn(Optional.of(marketplace));
        when(publicationRepository.findByMarketplaceIdAndStoreIdAndStatusAndActiveTrue(4L, 7L, ProductPublicationStatusEnum.APPROVED)).thenReturn(List.of(publication));
        when(contractRepository.existsByPartnershipIdAndStatus(8L, org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum.ACTIVE)).thenReturn(true);

        assertThat(dealerProductService.publicProducts("bank", 7L)).singleElement().satisfies(view -> assertThat(view.name()).isEqualTo("Car"));
    }
}
