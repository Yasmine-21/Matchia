package org.matchia.matchiabackend.service;

import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RequestServiceTest {

    @Test
    void linksCreatedMarketplaceBackToBankForImmediateSubscriptionCreation() {
        MarketplaceRepository marketplaceRepository = mock(MarketplaceRepository.class);
        when(marketplaceRepository.findByBankId(42L)).thenReturn(Optional.empty());
        when(marketplaceRepository.save(any(Marketplace.class))).thenAnswer(invocation -> {
            Marketplace marketplace = invocation.getArgument(0);
            marketplace.setId(7L);
            return marketplace;
        });

        RequestService service = new RequestService(
                mock(RequestRepository.class),
                mock(Validator.class),
                mock(EmailService.class),
                mock(PaymentService.class),
                mock(BankRepository.class),
                marketplaceRepository,
                mock(UserRepository.class),
                mock(StoreRepository.class),
                mock(ModuleRepository.class),
                mock(MarketplaceStoreRepository.class),
                mock(MarketplaceStoreModuleRepository.class),
                mock(AuditLogger.class),
                mock(NotificationService.class),
                mock(BankAdminCredentialsService.class),
                mock(JoinEmailVerificationService.class)
        );

        Bank bank = new Bank();
        bank.setId(42L);
        bank.setName("Banque test");

        Request request = new Request();
        request.setRequestType(RequestTypeEnum.join);
        request.setPrimaryColor("#123456");
        request.setSecondaryColor("#654321");
        request.setTotalAmount(8_800D);

        Marketplace result = ReflectionTestUtils.invokeMethod(
                service,
                "createMarketplace",
                bank,
                request,
                false
        );

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(MarketplaceStatusEnum.inactive);
        assertThat(bank.getMarketplace()).isSameAs(result);
        assertThat(bank.getMarketplace().getId()).isEqualTo(7L);
    }
}
