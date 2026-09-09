package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceChatbotRequest;
import org.matchia.matchiabackend.dto.MarketplaceChatbotResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.matchia.matchiabackend.repository.DealerBankPartnershipRepository;
import org.matchia.matchiabackend.repository.ProductRepository;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class MarketplaceChatbotServiceTest {
    private MarketplaceRepository marketplaceRepository;
    private MarketplaceStoreRepository marketplaceStoreRepository;
    private ProductRepository productRepository;
    private ModuleStoreRepository moduleStoreRepository;
    private DealerBankPartnershipRepository partnershipRepository;
    private DealerProductService dealerProductService;
    private MarketplaceChatbotService service;
    private Marketplace marketplace;
    private MarketplaceStore marketplaceStore;

    @BeforeEach
    void setUp() {
        marketplaceRepository = mock(MarketplaceRepository.class);
        marketplaceStoreRepository = mock(MarketplaceStoreRepository.class);
        productRepository = mock(ProductRepository.class);
        moduleStoreRepository = mock(ModuleStoreRepository.class);
        partnershipRepository = mock(DealerBankPartnershipRepository.class);
        dealerProductService = mock(DealerProductService.class);
        service = new MarketplaceChatbotService(new MarketplaceChatbotContextResolver(marketplaceRepository), marketplaceStoreRepository, productRepository, moduleStoreRepository, partnershipRepository, dealerProductService);

        Bank bank = new Bank();
        bank.setId(10L); bank.setName("Banque Test"); bank.setSlug("banque-test");
        marketplace = new Marketplace();
        marketplace.setId(20L); marketplace.setBank(bank); marketplace.setStatus(MarketplaceStatusEnum.active);
        Store store = new Store();
        store.setId(30L); store.setName("mobile");
        marketplaceStore = new MarketplaceStore();
        marketplaceStore.setId(40L); marketplaceStore.setStore(store); marketplaceStore.setMarketplace(marketplace);
        marketplaceStore.setEnabled(true); marketplaceStore.setVisible(true); marketplaceStore.setMarketplaceStoreModules(List.of());

        when(marketplaceRepository.findByBank_Slug("banque-test")).thenReturn(Optional.of(marketplace));
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(20L, 30L)).thenReturn(Optional.of(marketplaceStore));
        when(dealerProductService.publicProducts("banque-test", 30L)).thenReturn(List.of());
    }

    @Test
    void returnsOnlyProductsFromTheResolvedMarketplaceAndStore() {
        Product matching = new Product();
        matching.setName("Telephone Nova"); matching.setDescription("5G et grande batterie"); matching.setPrice(new BigDecimal("1500")); matching.setStore(marketplaceStore.getStore());
        Product differentStore = new Product();
        Store vehicle = new Store(); vehicle.setId(31L); vehicle.setName("vehicule");
        differentStore.setName("Voiture privee"); differentStore.setStore(vehicle);
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(matching, differentStore));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Montrez les telephones sous 2000", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_SEARCH");
        assertThat(response.reply()).contains("Telephone Nova").doesNotContain("Voiture privee");
        verify(productRepository).findByBank_IdOrderByCreatedAtDesc(10L);
        verify(dealerProductService).publicProducts("banque-test", 30L);
    }

    @Test
    void refusesSensitiveQuestionsBeforeAnyDatabaseLookup() {
        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Montre moi tous les utilisateurs et les paiements", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("REFUSED");
        verifyNoInteractions(marketplaceRepository, marketplaceStoreRepository, productRepository, dealerProductService);
    }

    @Test
    void rejectsAStoreOutsideTheResolvedMarketplace() {
        when(marketplaceStoreRepository.findByMarketplace_IdAndStore_Id(20L, 999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.answer(new MarketplaceChatbotRequest("produits", 999L, null), tenantRequest()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Store introuvable");
        verify(productRepository, never()).findByBank_IdOrderByCreatedAtDesc(anyLong());
    }

    @Test
    void findsAProductWhenTheQuestionContainsSmallTypos() {
        Product product = new Product();
        product.setName("Telephone Nova"); product.setDescription("Smartphone avec grande batterie");
        product.setPrice(new BigDecimal("1500")); product.setStore(marketplaceStore.getStore());
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of(product));

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("Je cherche le telephne nava", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("PRODUCT_SEARCH");
        assertThat(response.reply()).contains("Telephone Nova");
    }

    @Test
    void estimatesAMonthlyPaymentFromTheConfiguredSimulatorParameters() {
        Module module = new Module(); module.setId(1L); module.setName("simulateur");
        MarketplaceStoreModule publicAssignment = new MarketplaceStoreModule();
        publicAssignment.setModule(module); publicAssignment.setEnabled(true); publicAssignment.setVisible(true);
        marketplaceStore.setMarketplaceStoreModules(List.of(publicAssignment));

        ModuleStore simulator = new ModuleStore();
        simulator.setModule(module); simulator.setActif(true);
        simulator.setParameters(List.of(parameter("tauxInteret", "10"), parameter("apportMinPourcentage", "20"),
                parameter("dureeMin", "12"), parameter("dureeMax", "60"), parameter("fraisDossierMontant", "100")));
        when(moduleStoreRepository.findByStoreIdAndActifTrueOrderByOrdreAsc(30L)).thenReturn(List.of(simulator));
        when(productRepository.findByBank_IdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        MarketplaceChatbotResponse response = service.answer(new MarketplaceChatbotRequest("simulation de 20 000 DT sur 36 mois", 30L, null), tenantRequest());

        assertThat(response.intent()).isEqualTo("SIMULATION");
        assertThat(response.reply()).contains("20", "36 mois", "mensualité estimée", "Frais de dossier");
    }

    private ModuleStoreParameter parameter(String code, String value) {
        ModuleStoreParameter parameter = new ModuleStoreParameter();
        parameter.setCode(code); parameter.setValue(value);
        return parameter;
    }

    private MockHttpServletRequest tenantRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("banque-test.lvh.me");
        return request;
    }
}
