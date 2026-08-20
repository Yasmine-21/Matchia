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
}
