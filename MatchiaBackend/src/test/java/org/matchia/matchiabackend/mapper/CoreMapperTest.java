package org.matchia.matchiabackend.mapper;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.*;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.Module;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CoreMapperTest {

    @Test
    void bankMapperMapsBothDirectionsAndSupportsBothYearFields() {
        Bank bank = new Bank();
        bank.setId(1L);
        bank.setName("Bank");
        bank.setSlug("bank");
        bank.setEstablishedYear(2020);
        BankMapper mapper = new BankMapper();

        BankDto dto = mapper.toDto(bank);
        assertThat(dto.getName()).isEqualTo("Bank");
        assertThat(dto.getEstablishmentYear()).isEqualTo(2020);
        assertThat(mapper.toEntity(dto).getEstablishedYear()).isEqualTo(2020);
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void contentMapperMapsStoreDetailsAndCreatesStoreReference() {
        Store store = new Store();
        store.setId(2L);
        store.setName("Auto");
        Content content = new Content();
        content.setId(3L);
        content.setStore(store);
        content.setTitle("Title");
        ContentMapper mapper = new ContentMapper();

        ContentDto dto = mapper.toDto(content, true);
        assertThat(dto.getStoreName()).isEqualTo("Auto");
        assertThat(dto.getVisibleInMarketplace()).isTrue();
        assertThat(mapper.toEntity(dto).getStore().getId()).isEqualTo(2L);
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void notificationMapperUsesLegacyRequestIdWhenRelatedIdIsAbsent() {
        NotificationDto dto = new NotificationDto();
        dto.setTitle("Title");
        dto.setRequestId(4L);
        NotificationMapper mapper = new NotificationMapper();

        Notification entity = mapper.toEntity(dto);
        assertThat(entity.getRelatedRequestId()).isEqualTo(4L);
        assertThat(mapper.toDto(entity).getRequestId()).isEqualTo(4L);
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void storeMapperHandlesNullModulesAndCopiesEditableFields() {
        Store store = new Store();
        store.setId(5L);
        store.setName("Store");
        store.setPrice(BigDecimal.TEN);
        StoreMapper mapper = new StoreMapper();

        StoreDto dto = mapper.toDto(store);
        assertThat(dto.getModulesCount()).isZero();
        assertThat(mapper.toEntity(dto).getPrice()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void moduleMapperCopiesFieldsAndSupportsNullValues() {
        Module module = new Module();
        module.setId(6L);
        module.setName("Simulator");
        module.setPrice(BigDecimal.ONE);
        ModuleMapper mapper = new ModuleMapper();

        ModuleDto dto = mapper.toDto(module);
        assertThat(dto.getName()).isEqualTo("Simulator");
        assertThat(mapper.toEntity(dto).getPrice()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void productMapperMapsBankStoreAndParameterDefinitions() {
        Bank bank = new Bank();
        bank.setId(10L);
        bank.setName("Bank");
        Store store = new Store();
        store.setId(11L);
        store.setName("Store");
        ProductParameterDefinition definition = new ProductParameterDefinition();
        definition.setId(12L);
        definition.setName("Duration");
        ProductParameterValue value = new ProductParameterValue();
        value.setId(13L);
        value.setValue("24");
        value.setParameterDefinition(definition);
        Product product = new Product();
        product.setId(14L);
        product.setName("Loan");
        product.setBank(bank);
        product.setStore(store);
        product.setParameterValues(java.util.List.of(value));

        ProductDto dto = new ProductMapper().toDto(product);
        assertThat(dto.getBankId()).isEqualTo(10L);
        assertThat(dto.getStoreName()).isEqualTo("Store");
        assertThat(dto.getParameterValues()).singleElement().satisfies(parameter -> {
            assertThat(parameter.getParameterDefinitionId()).isEqualTo(12L);
            assertThat(parameter.getValue()).isEqualTo("24");
        });
        assertThat(new ProductMapper().toDto(null)).isNull();
        assertThat(new ProductMapper().toParameterValueDto(null)).isNull();
    }

    @Test
    void marketplaceStoreMappersHandleRelationshipsAndEditableFlags() {
        Bank bank = new Bank();
        bank.setId(20L);
        Marketplace marketplace = new Marketplace();
        marketplace.setId(21L);
        marketplace.setBank(bank);
        Store store = new Store();
        store.setId(22L);
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setId(23L);
        marketplaceStore.setMarketplace(marketplace);
        marketplaceStore.setStore(store);
        marketplaceStore.setEnabled(true);
        marketplaceStore.setVisible(false);
        MarketplaceStoreMapper storeMapper = new MarketplaceStoreMapper();

        MarketplaceStoreDto storeDto = storeMapper.toDto(marketplaceStore);
        assertThat(storeDto.getBankId()).isEqualTo(20L);
        assertThat(storeMapper.toEntity(storeDto).getEnabled()).isTrue();

        Module module = new Module();
        module.setId(24L);
        MarketplaceStoreModule link = new MarketplaceStoreModule();
        link.setId(25L);
        link.setMarketplaceStore(marketplaceStore);
        link.setModule(module);
        link.setEnabled(true);
        link.setVisible(true);
        MarketplaceStoreModuleMapper moduleMapper = new MarketplaceStoreModuleMapper();
        MarketplaceStoreModuleDto moduleDto = moduleMapper.toDto(link);
        assertThat(moduleDto.getModuleId()).isEqualTo(24L);
        assertThat(moduleMapper.toEntity(moduleDto).getVisible()).isTrue();
        assertThat(storeMapper.toDto(null)).isNull();
        assertThat(moduleMapper.toEntity(null)).isNull();
    }
}
