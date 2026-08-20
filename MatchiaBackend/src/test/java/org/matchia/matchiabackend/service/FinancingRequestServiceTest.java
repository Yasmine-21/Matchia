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
import java.math.BigDecimal;

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

    @Test
    void validatesRolesBuildsDashboardAndNotifiesOnlyDecisions() {
        Bank bank = new Bank(); bank.setId(1L);
        User client = new User(); client.setId(1L); client.setRole(RoleEnum.CLIENT); client.setBank(bank);
        User bankAdmin = new User(); bankAdmin.setRole(RoleEnum.ADMIN_BANK); bankAdmin.setBank(bank);
        when(userRepository.findByEmailIgnoreCase("client@test.com")).thenReturn(Optional.of(client));
        when(userRepository.findByEmailIgnoreCase("bank@test.com")).thenReturn(Optional.of(bankAdmin));
        assertThat(financingRequestService.currentClient("client@test.com")).isSameAs(client);
        assertThat(financingRequestService.currentBankAdmin("bank@test.com")).isSameAs(bankAdmin);
        assertThatThrownBy(() -> financingRequestService.currentBankAdmin("client@test.com")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        for (FinancingRequestStatusEnum status : FinancingRequestStatusEnum.values()) when(requestRepository.countByClient_IdAndStatus(1L, status)).thenReturn(1L);
        Store store = new Store(); store.setId(2L); store.setName("Store");
        Product product = new Product(); product.setId(3L); product.setName("Product");
        FinancingRequest accepted = new FinancingRequest(); accepted.setStatus(FinancingRequestStatusEnum.ACCEPTED); accepted.setClient(client); accepted.setStore(store); accepted.setProduct(product);
        FinancingRequest draft = new FinancingRequest(); draft.setStatus(FinancingRequestStatusEnum.DRAFT); draft.setClient(client); draft.setStore(store); draft.setProduct(product);
        when(requestRepository.findByClient_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(accepted, draft));
        assertThat(financingRequestService.clientDashboard("client@test.com").getTotal()).isEqualTo(4L);
        financingRequestService.ensureClientDecisionNotifications("client@test.com");
        verify(notificationService).createFinancingDecisionNotification(accepted);
        verify(notificationService, never()).createFinancingDecisionNotification(draft);
    }

    @Test
    void createsSubmitsAndProcessesFinancingRequestsWithoutRollingBackDecisionOnEmailFailure() {
        Bank bank = new Bank(); bank.setId(1L); bank.setName("Bank");
        User client = new User(); client.setId(2L); client.setRole(RoleEnum.CLIENT); client.setBank(bank); client.setFullName("Client");
        User admin = new User(); admin.setId(3L); admin.setRole(RoleEnum.ADMIN_BANK); admin.setBank(bank);
        Store store = new Store(); store.setId(4L); store.setName("Store");
        Product product = new Product(); product.setId(5L); product.setName("Produit"); product.setStore(store); product.setBank(bank); product.setPrice(BigDecimal.TEN);
        MarketplaceStore assignment = new MarketplaceStore(); assignment.setEnabled(true); assignment.setVisible(true);
        when(userRepository.findByEmailIgnoreCase("client@matchia.com")).thenReturn(Optional.of(client));
        when(userRepository.findByEmailIgnoreCase("admin@matchia.com")).thenReturn(Optional.of(admin));
        when(storeRepository.findById(4L)).thenReturn(Optional.of(store));
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(1L, 4L)).thenReturn(Optional.of(assignment));
        when(requestRepository.save(any(FinancingRequest.class))).thenAnswer(i -> i.getArgument(0));
        FinancingRequestDtos.CreateRequest input = new FinancingRequestDtos.CreateRequest();
        input.setStoreId(4L); input.setProductId(5L); input.setRequestedAmount(BigDecimal.valueOf(100)); input.setMonthlyPayment(BigDecimal.TEN);
        FinancingRequestDtos.DetailDto draft = financingRequestService.createDraft("client@matchia.com", input);
        assertThat(draft.getStatus()).isEqualTo(FinancingRequestStatusEnum.DRAFT);

        FinancingRequest pending = new FinancingRequest(); pending.setId(6L); pending.setClient(client); pending.setBank(bank); pending.setStore(store); pending.setProduct(product);
        pending.setStatus(FinancingRequestStatusEnum.DRAFT); pending.setReference("FIN-6");
        RequiredFinancingDocument optional = new RequiredFinancingDocument(); optional.setDocumentType("PHOTO"); optional.setLabel("Photo"); optional.setRequired(false);
        when(requestRepository.findByIdAndClient_Id(6L, 2L)).thenReturn(Optional.of(pending));
        when(requirementRepository.findByBank_IdAndStore_IdAndActiveTrueOrderByIdAsc(1L, 4L)).thenReturn(List.of(optional));
        when(requestRepository.saveAndFlush(pending)).thenReturn(pending);
        assertThat(financingRequestService.submit("client@matchia.com", 6L).getStatus()).isEqualTo(FinancingRequestStatusEnum.PENDING);

        pending.setStatus(FinancingRequestStatusEnum.PENDING);
        when(requestRepository.findByIdAndBank_Id(6L, 1L)).thenReturn(Optional.of(pending));
        when(requestRepository.saveAndFlush(pending)).thenReturn(pending);
        doThrow(new IllegalStateException("mail unavailable")).when(emailService).sendFinancingDecisionEmail(pending);
        FinancingRequestDtos.ProcessRequest decision = new FinancingRequestDtos.ProcessRequest();
        decision.setStatus(FinancingRequestStatusEnum.REJECTED); decision.setComment(" review "); decision.setRejectionReason(" insufficient income ");
        var processed = financingRequestService.process("admin@matchia.com", 6L, decision);
        assertThat(processed.getStatus()).isEqualTo(FinancingRequestStatusEnum.REJECTED);
        assertThat(pending.getRejectionReason()).isEqualTo("insufficient income");
        verify(notificationService).createFinancingDecisionNotification(pending);
    }
}
