package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.PartnershipContractDtos;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.DealerBankPartnership;
import org.matchia.matchiabackend.entity.PartnershipContract;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.DealerPartnershipStatusEnum;
import org.matchia.matchiabackend.entity.enums.PartnershipContractStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.DealerBankPartnershipRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.PartnershipContractRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnershipContractServiceTest {

    @Mock private PartnershipContractRepository contractRepository;
    @Mock private DealerBankPartnershipRepository partnershipRepository;
    @Mock private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock private DealerSecurityService security;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private AuditLogger auditLogger;
    @Mock private Authentication authentication;

    @InjectMocks
    private PartnershipContractService partnershipContractService;

    @Test
    void createDraftForApprovedPartnership_success() {
        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(1L);
        Dealer dealer = new Dealer();
        dealer.setId(1L);
        dealer.setCompanyName("Company");
        Bank bank = new Bank();
        bank.setId(1L);
        Store store = new Store();
        store.setId(1L);
        partnership.setDealer(dealer);
        partnership.setBank(bank);
        partnership.setStore(store);

        when(contractRepository.findByPartnershipId(1L)).thenReturn(Optional.empty());
        when(contractRepository.save(any())).thenAnswer(i -> {
            PartnershipContract c = i.getArgument(0);
            c.setId(1L);
            return c;
        });

        PartnershipContract result = partnershipContractService.createDraftForApprovedPartnership(partnership);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(PartnershipContractStatusEnum.DRAFT);
        verify(contractRepository).save(any(PartnershipContract.class));
    }

    @Test
    void forBankPartnership_success() {
        User user = new User();
        user.setRole(RoleEnum.ADMIN_BANK);
        Bank bank = new Bank();
        bank.setId(1L);
        user.setBank(bank);
        when(security.requireBank(authentication)).thenReturn(user);

        DealerBankPartnership partnership = new DealerBankPartnership();
        partnership.setId(1L);
        partnership.setBank(bank);
        when(partnershipRepository.findById(1L)).thenReturn(Optional.of(partnership));

        PartnershipContract contract = new PartnershipContract();
        contract.setId(1L);
        contract.setPartnership(partnership);
        Dealer dealer = new Dealer();
        dealer.setId(1L);
        contract.setDealer(dealer);
        contract.setBank(bank);
        Store store = new Store();
        store.setId(1L);
        contract.setStore(store);

        when(contractRepository.findByPartnershipId(1L)).thenReturn(Optional.of(contract));

        PartnershipContractDtos.View result = partnershipContractService.forBankPartnership(authentication, 1L);

        assertThat(result).isNotNull();
    }

    @Test
    void activatesAcceptedContractAndSynchronizesPartnership() {
        Bank bank = new Bank(); bank.setId(1L); bank.setName("Bank");
        Dealer dealer = new Dealer(); dealer.setId(2L); dealer.setCompanyName("Dealer");
        Store store = new Store(); store.setId(3L); store.setName("Auto");
        DealerBankPartnership partnership = new DealerBankPartnership(); partnership.setId(4L); partnership.setBank(bank); partnership.setDealer(dealer); partnership.setStore(store);
        PartnershipContract contract = new PartnershipContract(); contract.setId(5L); contract.setBank(bank); contract.setDealer(dealer); contract.setStore(store); contract.setPartnership(partnership);
        contract.setStatus(PartnershipContractStatusEnum.PENDING_ACCEPTANCE); contract.setDealerAcceptedAt(LocalDateTime.now()); contract.setStartDate(LocalDate.now()); contract.setEndDate(LocalDate.now().plusDays(20));
        User bankAdmin = new User(); bankAdmin.setRole(RoleEnum.ADMIN_BANK); bankAdmin.setBank(bank);
        when(security.requireBank(authentication)).thenReturn(bankAdmin);
        when(contractRepository.findDetailedById(5L)).thenReturn(Optional.of(contract));
        when(contractRepository.save(any(PartnershipContract.class))).thenAnswer(i -> i.getArgument(0));
        when(partnershipRepository.save(any(DealerBankPartnership.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(2L, RoleEnum.DEALER_ADMIN)).thenReturn(Optional.empty());

        PartnershipContractDtos.View view = partnershipContractService.activate(authentication, 5L);

        assertThat(view.status()).isEqualTo(PartnershipContractStatusEnum.ACTIVE);
        assertThat(partnership.getStatus()).isEqualTo(DealerPartnershipStatusEnum.ACTIVE);
        verify(auditLogger).logAsync(any());
    }
}
