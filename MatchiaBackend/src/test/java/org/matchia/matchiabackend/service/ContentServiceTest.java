package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ContentDto;
import org.matchia.matchiabackend.entity.Content;
import org.matchia.matchiabackend.entity.ContentVisibility;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.ContentStatusEnum;
import org.matchia.matchiabackend.mapper.ContentMapper;
import org.matchia.matchiabackend.repository.ContentRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private ContentRepository contentRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private MarketplaceRepository marketplaceRepository;
    @Mock
    private ContentMapper contentMapper;
    @Mock
    private ContentVisibilityService contentVisibilityService;

    @InjectMocks
    private ContentService contentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(contentService, "contentUploadDir", "target/test-uploads/content");
    }

    @Test
    void getAllContents_success() {
        Content content = new Content();
        when(contentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(content));
        when(contentMapper.toDto(content)).thenReturn(new ContentDto());

        List<ContentDto> result = contentService.getAllContents();

        assertThat(result).hasSize(1);
    }

    @Test
    void getContentsByMarketplaceSlug_success() {
        Marketplace marketplace = new Marketplace();
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        Store store = new Store();
        store.setId(1L);
        marketplaceStore.setStore(store);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));

        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        when(contentVisibilityService.getVisibilityMapByMarketplaceSlug("slug")).thenReturn(Map.of(1L, true));

        Content content = new Content();
        content.setId(1L);
        when(contentRepository.findByStore_IdInOrderByCreatedAtDesc(List.of(1L))).thenReturn(List.of(content));
        when(contentMapper.toDto(any(), anyBoolean())).thenReturn(new ContentDto());

        List<ContentDto> result = contentService.getContentsByMarketplaceSlug("slug");

        assertThat(result).hasSize(1);
    }

    @Test
    void createContent_success() throws IOException {
        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        Marketplace marketplace = new Marketplace();
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(store);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));

        when(contentRepository.save(any())).thenReturn(new Content());
        when(contentMapper.toDto(any())).thenReturn(new ContentDto());

        MockMultipartFile image = new MockMultipartFile("image", "test.png", "image/png", "data".getBytes());

        ContentDto result = contentService.createContent(1L, "title", "desc", "active", "slug", image);

        assertThat(result).isNotNull();
        verify(contentRepository).save(any(Content.class));
    }
    
    @Test
    void createContent_invalidImage_throwsException() {
        Store store = new Store();
        store.setId(1L);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        Marketplace marketplace = new Marketplace();
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(store);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));

        MockMultipartFile image = new MockMultipartFile("image", "test.txt", "text/plain", "data".getBytes());

        assertThatThrownBy(() -> contentService.createContent(1L, "title", "desc", "active", "slug", image))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateMarketplaceVisibility_success() {
        ContentVisibility visibility = new ContentVisibility();
        visibility.setContent(new Content());
        when(contentVisibilityService.updateVisibility(1L, "slug", true)).thenReturn(visibility);
        when(contentMapper.toDto(any(), anyBoolean())).thenReturn(new ContentDto());

        ContentDto result = contentService.updateMarketplaceVisibility(1L, "slug", true);

        assertThat(result).isNotNull();
    }

    @Test
    void deleteContent_success() {
        Content content = new Content();
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));

        contentService.deleteContent(1L);

        verify(contentRepository).delete(content);
    }
}
