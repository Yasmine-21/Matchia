package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreRequestActivationServiceTest {

    @Mock private BankRepository bankRepository;
    @Mock private MarketplaceRepository marketplaceRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock private MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;

    @InjectMocks
    private StoreRequestActivationService storeRequestActivationService;

    @Test
    void activateAfterPayment_notStoreRequest_returnsBank() {
        Request request = new Request();
        request.setRequestType(RequestTypeEnum.join);
        Bank bank = new Bank();
        bank.setId(1L);
        request.setBank(bank);

        Bank result = storeRequestActivationService.activateAfterPayment(request, null);

        assertThat(result).isEqualTo(bank);
    }

    @Test
    void activateAfterPayment_storeRequest_success() {
        Request request = new Request();
        request.setRequestType(RequestTypeEnum.store);
        Bank bank = new Bank();
        bank.setId(1L);
        request.setBank(bank);

        RequestStoreSelection rss = new RequestStoreSelection();
        rss.setStoreId(1L);
        RequestModuleSelection rms = new RequestModuleSelection();
        rms.setModuleId(1L);
        rss.setModules(List.of(rms));
        request.setSelectedStoreDetails(List.of(rss));

        Marketplace marketplace = new Marketplace();
        marketplace.setId(1L);

        when(marketplaceRepository.findByBankId(1L)).thenReturn(Optional.of(marketplace));
        
        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        MarketplaceStore ms = new MarketplaceStore();
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(1L, 1L)).thenReturn(Optional.of(ms));
        
        MarketplaceStore savedMs = new MarketplaceStore();
        savedMs.setId(1L);
        when(marketplaceStoreRepository.save(ms)).thenReturn(savedMs);

        Module module = new Module();
        module.setId(1L);
        when(moduleRepository.findById(1L)).thenReturn(Optional.of(module));
        
        MarketplaceStoreModule msm = new MarketplaceStoreModule();
        when(marketplaceStoreModuleRepository.findByMarketplaceStore_IdAndModule_Id(1L, 1L)).thenReturn(Optional.of(msm));

        Payment payment = new Payment();
        payment.setAmount(BigDecimal.TEN);

        Bank result = storeRequestActivationService.activateAfterPayment(request, payment);

        assertThat(result).isEqualTo(bank);
    }
}
