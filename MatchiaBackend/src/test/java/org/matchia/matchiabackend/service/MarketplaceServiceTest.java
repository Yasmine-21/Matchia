package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.MarketplaceBrandingDto;
import org.matchia.matchiabackend.dto.MarketplaceConfigDto;
import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.mapper.MarketplaceMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MarketplaceServiceTest {

    @Mock
    private MarketplaceRepository marketplaceRepository;
    @Mock
    private BankRepository bankRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock
    private MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    @Mock
    private MarketplaceMapper marketplaceMapper;

    @InjectMocks
    private MarketplaceService marketplaceService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(marketplaceService, "uploadDir", "target/test-uploads");
    }

    private Bank createBank() {
        Bank bank = new Bank();
        bank.setId(1L);
        bank.setName("Test Bank");
        bank.setSlug("test-bank");
        return bank;
    }

    private Marketplace createMarketplace() {
        Marketplace marketplace = new Marketplace();
        marketplace.setId(1L);
        marketplace.setBank(createBank());
        marketplace.setStatus(MarketplaceStatusEnum.active);
        return marketplace;
    }

    @Test
    void save_success() {
        Marketplace marketplace = createMarketplace();
        when(marketplaceRepository.save(marketplace)).thenReturn(marketplace);

        Marketplace result = marketplaceService.save(marketplace);

        assertThat(result).isNotNull();
        verify(marketplaceRepository).save(marketplace);
    }

    @Test
    void saveBanniere_success() throws IOException {
        MockMultipartFile banniere = new MockMultipartFile("banniere", "banniere.png", "image/png", "img_content".getBytes());
        String url = marketplaceService.saveBanniere(banniere);
        assertThat(url).contains("/uploads/logos/");
    }

    @Test
    void saveBanniere_nullFile_throwsException() {
        assertThatThrownBy(() -> marketplaceService.saveBanniere(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void saveLogo_success() throws IOException {
        MockMultipartFile logo = new MockMultipartFile("logo", "logo.png", "image/png", "img_content".getBytes());
        String url = marketplaceService.saveLogo(logo);
        assertThat(url).contains("/uploads/logos/");
    }

    @Test
    void findAll_success() {
        Marketplace marketplace = createMarketplace();
        when(marketplaceRepository.findAll()).thenReturn(List.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_Id(1L)).thenReturn(Collections.emptyList());

        List<Marketplace> result = marketplaceService.findAll();

        assertThat(result).hasSize(1);
    }

    @Test
    void findById_success() {
        Marketplace marketplace = createMarketplace();
        when(marketplaceRepository.findById(1L)).thenReturn(Optional.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_Id(1L)).thenReturn(Collections.emptyList());

        Optional<Marketplace> result = marketplaceService.findById(1L);

        assertThat(result).isPresent();
    }

    @Test
    void findBySlug_success() {
        Marketplace marketplace = createMarketplace();
        when(marketplaceRepository.findByBank_Slug("test-bank")).thenReturn(Optional.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_Id(1L)).thenReturn(Collections.emptyList());

        Optional<Marketplace> result = marketplaceService.findBySlug("test-bank");

        assertThat(result).isPresent();
    }
    
    @Test
    void findPublicStoreByIdentifier_success() {
        Marketplace marketplace = createMarketplace();
        
        Store store = new Store();
        store.setId(10L);
        store.setName("Test Store");
        
        MarketplaceStore mkStore = new MarketplaceStore();
        mkStore.setId(100L);
        mkStore.setStore(store);
        mkStore.setEnabled(true);
        mkStore.setVisible(true);
        
        MarketplaceDto.MarketplaceStoreDetailDto detailDto = new MarketplaceDto.MarketplaceStoreDetailDto(
            100L, 10L, "Test Store", "Desc", "url", "banner", BigDecimal.valueOf(100), true, true, List.of()
        );

        when(marketplaceRepository.findByBank_Slug("test-bank")).thenReturn(Optional.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_Id(1L)).thenReturn(List.of(mkStore));
        when(marketplaceMapper.resolveRequestedModulesByStore("test-bank")).thenReturn(Map.of());
        when(marketplaceMapper.toPublicStoreDetailDto(eq(mkStore), any())).thenReturn(detailDto);

        Optional<MarketplaceDto.MarketplaceStoreDetailDto> result = marketplaceService.findPublicStoreByIdentifier("test-bank", "test-store");

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Test Store");
    }

    @Test
    void configureMarketplace_success() {
        MarketplaceConfigDto dto = new MarketplaceConfigDto();
        dto.setBankId(1L);
        dto.setMarketplaceSlug("new-slug");
        dto.setPrimaryColor("#000000");
        dto.setSecondaryColor("#FFFFFF");
        dto.setStoreIds(List.of(10L));
        dto.setModuleIds(List.of(20L));

        Bank bank = createBank();
        Marketplace marketplace = new Marketplace();

        when(bankRepository.findById(1L)).thenReturn(Optional.of(bank));
        when(bankRepository.findBySlug("new-slug")).thenReturn(Optional.empty());
        when(bankRepository.save(any(Bank.class))).thenReturn(bank);
        when(marketplaceRepository.findByBankId(1L)).thenReturn(Optional.of(marketplace));
        when(marketplaceRepository.save(any(Marketplace.class))).thenAnswer(i -> {
            Marketplace m = (Marketplace) i.getArguments()[0];
            m.setId(1L);
            return m;
        });

        Store store = new Store();
        store.setId(10L);
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));
        
        MarketplaceStore mkStore = new MarketplaceStore();
        mkStore.setId(100L);
        mkStore.setStore(store);
        when(marketplaceStoreRepository.findByMarketplace_Id(any())).thenReturn(Collections.emptyList());
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(1L, 10L)).thenReturn(Optional.of(mkStore));
        when(marketplaceStoreRepository.save(any(MarketplaceStore.class))).thenAnswer(i -> {
            MarketplaceStore assignment = i.getArgument(0);
            assignment.setId(100L);
            return assignment;
        });

        Module module = new Module();
        module.setId(20L);
        when(moduleRepository.findById(20L)).thenReturn(Optional.of(module));
        
        when(marketplaceStoreModuleRepository.findByMarketplaceStore_IdAndModule_Id(100L, 20L))
            .thenReturn(Optional.empty());

        Marketplace result = marketplaceService.configureMarketplace(dto);

        assertThat(result).isNotNull();
        verify(marketplaceRepository, times(1)).save(any());
        verify(marketplaceStoreModuleRepository).save(any());
    }

    @Test
    void configureMarketplace_invalidSlug_throwsException() {
        MarketplaceConfigDto dto = new MarketplaceConfigDto();
        dto.setBankId(1L);
        dto.setMarketplaceSlug("invalid slug");

        assertThatThrownBy(() -> marketplaceService.configureMarketplace(dto))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateMarketplace_success() {
        Marketplace existingMarketplace = createMarketplace();
        
        MarketplaceConfigDto dto = new MarketplaceConfigDto();
        dto.setMarketplaceSlug("updated-slug");
        dto.setPrimaryColor("#000000");
        dto.setSecondaryColor("#FFFFFF");
        dto.setStoreIds(List.of(10L));
        dto.setModuleIds(List.of(20L));

        when(marketplaceRepository.findById(1L)).thenReturn(Optional.of(existingMarketplace));
        when(bankRepository.findById(1L)).thenReturn(Optional.of(existingMarketplace.getBank()));
        when(bankRepository.findBySlug("updated-slug")).thenReturn(Optional.empty());
        when(bankRepository.save(any(Bank.class))).thenReturn(existingMarketplace.getBank());
        when(marketplaceRepository.findByBankId(1L)).thenReturn(Optional.of(existingMarketplace));
        when(marketplaceRepository.save(any())).thenReturn(existingMarketplace);
        
        Store store = new Store();
        store.setId(10L);
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(any(), any())).thenReturn(Optional.of(new MarketplaceStore()));
        when(marketplaceStoreRepository.save(any(MarketplaceStore.class))).thenAnswer(i -> {
            MarketplaceStore assignment = i.getArgument(0);
            assignment.setId(100L);
            return assignment;
        });
        Module module = new Module();
        module.setId(20L);
        when(moduleRepository.findById(20L)).thenReturn(Optional.of(module));

        Marketplace result = marketplaceService.updateMarketplace(1L, dto);

        assertThat(result).isNotNull();
    }

    @Test
    void updateMarketplaceBranding_success() {
        Marketplace existingMarketplace = createMarketplace();
        MarketplaceBrandingDto dto = new MarketplaceBrandingDto();
        dto.setPrimaryColor("#123123");
        dto.setSecondaryColor("#321321");
        dto.setHomepageTitle("New Title");

        when(marketplaceRepository.findById(1L)).thenReturn(Optional.of(existingMarketplace));
        when(marketplaceRepository.save(any())).thenReturn(existingMarketplace);
        
        Marketplace result = marketplaceService.updateMarketplaceBranding(1L, dto);

        assertThat(result.getPrimaryColor()).isEqualTo("#123123");
        verify(marketplaceRepository).save(existingMarketplace);
    }

    @Test
    void updateStatus_success() {
        Marketplace existingMarketplace = createMarketplace();
        existingMarketplace.setStatus(MarketplaceStatusEnum.inactive);

        when(marketplaceRepository.findById(1L)).thenReturn(Optional.of(existingMarketplace));
        when(marketplaceRepository.save(any())).thenReturn(existingMarketplace);

        Marketplace result = marketplaceService.updateStatus(1L, MarketplaceStatusEnum.active);

        assertThat(result.getStatus()).isEqualTo(MarketplaceStatusEnum.active);
    }

    @Test
    void deleteById_success() {
        when(marketplaceRepository.existsById(1L)).thenReturn(true);
        marketplaceService.deleteById(1L);
        verify(marketplaceRepository).deleteById(1L);
    }

    @Test
    void deleteById_notFound_throwsException() {
        when(marketplaceRepository.existsById(1L)).thenReturn(false);
        assertThatThrownBy(() -> marketplaceService.deleteById(1L))
                .isInstanceOf(NoSuchElementException.class);
    }
}
