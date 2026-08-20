package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.FinancingRequestDtos;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinancingRequestServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private BankRepository bankRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private ProductRepository productRepository;
    @Mock private DealerProductRepository dealerProductRepository;
    @Mock private ProductPublicationRequestRepository publicationRepository;
    @Mock private PartnershipContractRepository partnershipContractRepository;
    @Mock private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock private FinancingRequestRepository requestRepository;
    @Mock private FinancingRequestDocumentRepository documentRepository;
    @Mock private RequiredFinancingDocumentRepository requirementRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;

    @InjectMocks
    private FinancingRequestService financingRequestService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(financingRequestService, "financingUploadDir", "target/test-uploads/financing-documents");
    }

    @Test
    void clientRequests_success() {
        User client = new User();
        client.setId(1L);
        client.setRole(RoleEnum.CLIENT);
        Bank bank = new Bank();
        bank.setId(1L);
        client.setBank(bank);

        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(client));

        FinancingRequest req = new FinancingRequest();
        req.setId(1L);
        req.setClient(client);
        req.setReference("FIN-123");
        Product p = new Product();
        p.setId(1L);
        p.setName("Product");
        req.setProduct(p);
        Store s = new Store();
        s.setId(1L);
        s.setName("Store");
        req.setStore(s);
        req.setStatus(FinancingRequestStatusEnum.PENDING);
        
        when(requestRepository.findByClient_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(req));

        List<FinancingRequestDtos.SummaryDto> result = financingRequestService.clientRequests("test@test.com");

        assertThat(result).hasSize(1);
    }
}
