package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.MarketplaceContentDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceContent;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ContentStatusEnum;
import org.matchia.matchiabackend.mapper.MarketplaceContentMapper;
import org.matchia.matchiabackend.repository.MarketplaceContentRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MarketplaceContentServiceTest {
    private MarketplaceContentRepository contents;
    private StoreRepository stores;
    private MarketplaceRepository marketplaces;
    private MarketplaceContentMapper mapper;
    private MarketplaceContentService service;
    private Marketplace marketplace;
    private Store store;

    @BeforeEach
    void setUp() {
        contents = mock(MarketplaceContentRepository.class); stores = mock(StoreRepository.class);
        marketplaces = mock(MarketplaceRepository.class); mapper = mock(MarketplaceContentMapper.class);
        service = new MarketplaceContentService(contents, stores, marketplaces, mapper);
        ReflectionTestUtils.setField(service, "contentUploadDir", "target/test-uploads/content");
        marketplace = new Marketplace(); marketplace.setId(1L);
        store = new Store(); store.setId(2L);
        MarketplaceStore assignment = new MarketplaceStore(); assignment.setStore(store);
        marketplace.setMarketplaceStores(List.of(assignment));
        when(marketplaces.findByBank_Slug("bank")).thenReturn(Optional.of(marketplace));
    }

    @Test
    void listsAllAndMarketplaceSpecificContent() {
        MarketplaceContent content = new MarketplaceContent(); MarketplaceContentDto dto = new MarketplaceContentDto();
        when(contents.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(content));
        when(contents.findByMarketplace_Bank_SlugOrderByCreatedAtDesc("bank")).thenReturn(List.of(content));
        when(mapper.toDto(content)).thenReturn(dto);
        assertThat(service.getAllContents()).containsExactly(dto);
        assertThat(service.getContentsByMarketplaceSlug(" BANK ")).containsExactly(dto);
        assertThat(service.getContentsByMarketplaceSlug(" ")).isEmpty();
    }

    @Test
    void createsAndUpdatesOwnedContent() throws Exception {
        when(stores.findById(2L)).thenReturn(Optional.of(store));
        when(contents.save(any())).thenAnswer(i -> i.getArgument(0));
        MarketplaceContentDto dto = new MarketplaceContentDto(); when(mapper.toDto(any())).thenReturn(dto);
        MarketplaceContentDto created = service.createContent(2L, " Title ", " Description ", null, "bank", null);
        assertThat(created).isSameAs(dto);
        verify(contents).save(argThat(value -> value.getStatus() == ContentStatusEnum.active && value.getTitle().equals("Title")));

        MarketplaceContent current = new MarketplaceContent(); current.setMarketplace(marketplace); current.setImageUrl("old");
        when(contents.findById(9L)).thenReturn(Optional.of(current));
        service.updateContent(9L, 2L, "New", "Body", "inactive", "bank", null);
        assertThat(current.getStatus()).isEqualTo(ContentStatusEnum.inactive);
        assertThat(current.getImageUrl()).isEqualTo("old");
    }

    @Test
    void rejectsInvalidInputAndPreventsCrossMarketplaceDeletion() {
        assertThatThrownBy(() -> service.createContent(null, "", "body", null, "bank", null)).isInstanceOf(IllegalArgumentException.class);
        Marketplace other = new Marketplace(); other.setId(99L);
        MarketplaceContent content = new MarketplaceContent(); content.setMarketplace(other);
        when(contents.findById(1L)).thenReturn(Optional.of(content));
        assertThatThrownBy(() -> service.deleteContent(1L, "bank")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deleteContent(null, "bank")).isInstanceOf(IllegalArgumentException.class);
    }
}
