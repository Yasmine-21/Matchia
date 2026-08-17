package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class DealerPartnershipServiceTest {
    @Mock private DealerBankPartnershipRepository repository;
    @Mock private DealerRepository dealerRepository;
    @Mock private BankRepository bankRepository;
    @Mock private MarketplaceRepository marketplaceRepository;
    @Mock private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock private DealerSecurityService security;
    @Mock private DealerAccountService accountService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private AuditLogger auditLogger;
    @Mock private PartnershipContractService contractService;
    @Mock private Authentication authentication;

    private DealerPartnershipService service;
    private Dealer dealer;
    private Store store;

    @BeforeEach
    void setUp() {
        service = new DealerPartnershipService(repository, dealerRepository, bankRepository, marketplaceRepository,
                marketplaceStoreRepository, security, accountService, userRepository,
                notificationService, emailService, auditLogger, contractService);
        store = new Store();
        store.setId(7L);
        store.setStatus(StoreStatusEnum.active);
        dealer = new Dealer();
        dealer.setId(11L);
        dealer.setStore(store);
        dealer.setStatus(DealerStatusEnum.ACTIVE);
    }

    @Test
    void createRejectsDuplicatePendingPartnership() {
        User dealerAdmin = new User();
        dealerAdmin.setDealer(dealer);
        dealerAdmin.setRole(RoleEnum.DEALER_ADMIN);
        Bank bank = new Bank();
        bank.setId(21L);
        bank.setStatus(BankStatusEnum.active);
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(store);
        marketplaceStore.setEnabled(true);
        marketplaceStore.setVisible(true);

        when(security.requireDealer(authentication)).thenReturn(dealerAdmin);
        when(bankRepository.findById(21L)).thenReturn(Optional.of(bank));
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(21L, 7L))
                .thenReturn(Optional.of(marketplaceStore));
        when(repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                11L, 21L, 7L, List.of(DealerPartnershipStatusEnum.PENDING,
                        DealerPartnershipStatusEnum.APPROVED, DealerPartnershipStatusEnum.WAITING_CONTRACT,
                        DealerPartnershipStatusEnum.ACTIVE,
                        DealerPartnershipStatusEnum.SUSPENDED)))
                .thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.create(authentication, new DealerDtos.PartnershipCreate(21L, 7L, null)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void availableBanksOnlyReturnsBanksWithTheDealersStore() {
        User dealerAdmin = new User();
        dealerAdmin.setDealer(dealer);
        dealerAdmin.setRole(RoleEnum.DEALER_ADMIN);

        Bank compatibleBank = activeBank(21L, "Compatible");
        Bank incompatibleBank = activeBank(22L, "Incompatible");
        Store otherStore = new Store();
        otherStore.setId(8L);
        otherStore.setStatus(StoreStatusEnum.active);

        Marketplace compatibleMarketplace = activeMarketplace(31L, compatibleBank, store);
        Marketplace incompatibleMarketplace = activeMarketplace(32L, incompatibleBank, otherStore);

        when(security.requireDealer(authentication)).thenReturn(dealerAdmin);
        when(marketplaceRepository.findAll()).thenReturn(List.of(compatibleMarketplace, incompatibleMarketplace));

        List<DealerDtos.BankOption> result = service.availableBanks(authentication);

        assertEquals(1, result.size());
        assertEquals(21L, result.get(0).bankId());
        assertEquals(7L, result.get(0).stores().get(0).storeId());
    }

    @Test
    void bankRetrievesActiveDealersForSelectedMarketplaceStore() {
        Bank bank = activeBank(21L, "Banque test");
        User bankAdmin = new User();
        bankAdmin.setRole(RoleEnum.ADMIN_BANK);
        bankAdmin.setBank(bank);
        store.setName("vehicule");
        dealer.setCompanyName("Concessionnaire vehicule");
        MarketplaceStore assignment = new MarketplaceStore();
        assignment.setStore(store);
        assignment.setEnabled(true);
        assignment.setVisible(true);
        DealerDtos.DealerView dealerView = new DealerDtos.DealerView(
                11L, dealer.getCompanyName(), null, null, null, null, null, null, null, null,
                7L, store.getName(), DealerStatusEnum.ACTIVE, null);

        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(21L, 7L))
                .thenReturn(Optional.of(assignment));
        when(dealerRepository.findByStore_IdAndStatusOrderByCompanyNameAsc(7L, DealerStatusEnum.ACTIVE))
                .thenReturn(List.of(dealer));
        when(accountService.toDealerView(dealer)).thenReturn(dealerView);

        List<DealerDtos.DealerView> result = service.dealersByStore(authentication, null, 7L);

        assertEquals(1, result.size());
        assertEquals(7L, result.get(0).storeId());
        assertEquals("Concessionnaire vehicule", result.get(0).companyName());
    }

    @Test
    void bankDoesNotRetrieveDealerWithExistingPartnershipForSelectedStore() {
        Bank bank = activeBank(21L, "Banque test");
        User bankAdmin = new User();
        bankAdmin.setRole(RoleEnum.ADMIN_BANK);
        bankAdmin.setBank(bank);
        MarketplaceStore assignment = new MarketplaceStore();
        assignment.setStore(store);
        assignment.setEnabled(true);
        assignment.setVisible(true);

        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(21L, 7L))
                .thenReturn(Optional.of(assignment));
        when(dealerRepository.findByStore_IdAndStatusOrderByCompanyNameAsc(7L, DealerStatusEnum.ACTIVE))
                .thenReturn(List.of(dealer));
        when(repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                11L, 21L, 7L, List.of(
                        DealerPartnershipStatusEnum.PENDING,
                        DealerPartnershipStatusEnum.APPROVED,
                        DealerPartnershipStatusEnum.WAITING_CONTRACT,
                        DealerPartnershipStatusEnum.ACTIVE,
                        DealerPartnershipStatusEnum.SUSPENDED)))
                .thenReturn(true);

        List<DealerDtos.DealerView> result = service.dealersByStore(authentication, null, 7L);

        assertEquals(0, result.size());
    }

    @Test
    void bankCannotProcessAnotherBanksPartnership() {
        Bank currentBank = new Bank();
        currentBank.setId(31L);
        Bank ownerBank = new Bank();
        ownerBank.setId(32L);
        User bankAdmin = new User();
        bankAdmin.setRole(RoleEnum.ADMIN_BANK);
        bankAdmin.setBank(currentBank);
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(41L);
        partnership.setBank(ownerBank);

        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(repository.findById(41L)).thenReturn(Optional.of(partnership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.decide(authentication, 41L, DealerPartnershipStatusEnum.APPROVED, null));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void saasAdminOnlySeesPartnershipsForRequestedTenant() {
        User saasAdmin = new User();
        saasAdmin.setRole(RoleEnum.ADMIN_SAAS);
        Bank tenantBank = activeBank(31L, "Banque test1234");
        tenantBank.setSlug("test1234");

        when(security.requireBank(authentication)).thenReturn(saasAdmin);
        when(bankRepository.findBySlug("test1234")).thenReturn(Optional.of(tenantBank));
        when(repository.findByBankIdOrderByRequestDateDesc(31L)).thenReturn(List.of());

        List<DealerDtos.PartnershipView> result = service.forBank(authentication, "test1234");

        assertEquals(0, result.size());
        verify(repository).findByBankIdOrderByRequestDateDesc(31L);
        verify(repository, never()).findAll();
    }

    @Test
    void approvalCreatesDraftContractWithoutActivatingPartnership() {
        Bank bank = activeBank(31L, "Banque partenaire");
        User bankAdmin = new User();
        bankAdmin.setRole(RoleEnum.ADMIN_BANK);
        bankAdmin.setBank(bank);
        dealer.setCompanyName("Concessionnaire test");
        store.setName("vehicule");
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(41L);
        partnership.setBank(bank);
        partnership.setDealer(dealer);
        partnership.setStore(store);
        partnership.setStatus(DealerPartnershipStatusEnum.PENDING);
        partnership.setInitiatedBy(PartnershipInitiatorEnum.DEALER);

        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(repository.findById(41L)).thenReturn(Optional.of(partnership));
        when(repository.save(any(DealerBankPartnership.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(11L, RoleEnum.DEALER_ADMIN))
                .thenReturn(Optional.empty());
        when(accountService.toDealerView(dealer)).thenReturn(new DealerDtos.DealerView(
                11L, dealer.getCompanyName(), null, null, null, null, null, null, null, null,
                7L, store.getName(), DealerStatusEnum.ACTIVE, null));

        DealerDtos.PartnershipView result = service.decide(
                authentication, 41L, DealerPartnershipStatusEnum.APPROVED, null);

        assertEquals(DealerPartnershipStatusEnum.WAITING_CONTRACT, result.status());
        verify(contractService).createDraftForApprovedPartnership(partnership);
    }

    @Test
    void bankCannotApproveItsOwnInvitation() {
        Bank bank = activeBank(31L, "Banque partenaire");
        User bankAdmin = new User();
        bankAdmin.setRole(RoleEnum.ADMIN_BANK);
        bankAdmin.setBank(bank);
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(41L);
        partnership.setBank(bank);
        partnership.setDealer(dealer);
        partnership.setStore(store);
        partnership.setStatus(DealerPartnershipStatusEnum.PENDING);
        partnership.setInitiatedBy(PartnershipInitiatorEnum.BANK);

        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(repository.findById(41L)).thenReturn(Optional.of(partnership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.decide(authentication, 41L, DealerPartnershipStatusEnum.APPROVED, null));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void dealerCanAcceptBankInvitationAndStartsContractWorkflow() {
        Bank bank = activeBank(31L, "Banque partenaire");
        User dealerAdmin = new User();
        dealerAdmin.setRole(RoleEnum.DEALER_ADMIN);
        dealerAdmin.setDealer(dealer);
        dealer.setCompanyName("Concessionnaire test");
        store.setName("vehicule");
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(41L);
        partnership.setBank(bank);
        partnership.setDealer(dealer);
        partnership.setStore(store);
        partnership.setStatus(DealerPartnershipStatusEnum.PENDING);
        partnership.setInitiatedBy(PartnershipInitiatorEnum.BANK);

        when(security.requireDealer(authentication)).thenReturn(dealerAdmin);
        when(repository.findById(41L)).thenReturn(Optional.of(partnership));
        when(repository.save(any(DealerBankPartnership.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(31L, RoleEnum.ADMIN_BANK))
                .thenReturn(Optional.empty());
        when(accountService.toDealerView(dealer)).thenReturn(new DealerDtos.DealerView(
                11L, dealer.getCompanyName(), null, null, null, null, null, null, null, null,
                7L, store.getName(), DealerStatusEnum.ACTIVE, null));

        DealerDtos.PartnershipView result = service.decideByDealer(
                authentication, 41L, DealerPartnershipStatusEnum.APPROVED, null);

        assertEquals(DealerPartnershipStatusEnum.WAITING_CONTRACT, result.status());
        verify(contractService).createDraftForApprovedPartnership(partnership);
    }

    private Bank activeBank(Long id, String name) {
        Bank bank = new Bank();
        bank.setId(id);
        bank.setName(name);
        bank.setStatus(BankStatusEnum.active);
        return bank;
    }

    private Marketplace activeMarketplace(Long id, Bank bank, Store marketplaceStoreCategory) {
        Marketplace marketplace = new Marketplace();
        marketplace.setId(id);
        marketplace.setBank(bank);
        marketplace.setStatus(MarketplaceStatusEnum.active);
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setMarketplace(marketplace);
        marketplaceStore.setStore(marketplaceStoreCategory);
        marketplaceStore.setEnabled(true);
        marketplaceStore.setVisible(true);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        return marketplace;
    }
}
