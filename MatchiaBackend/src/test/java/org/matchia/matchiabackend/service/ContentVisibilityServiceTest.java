package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.Content;
import org.matchia.matchiabackend.entity.ContentVisibility;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.repository.ContentRepository;
import org.matchia.matchiabackend.repository.ContentVisibilityRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentVisibilityServiceTest {

    @Mock
    private ContentVisibilityRepository contentVisibilityRepository;

    @Mock
    private ContentRepository contentRepository;

    @Mock
    private MarketplaceRepository marketplaceRepository;

    @InjectMocks
    private ContentVisibilityService service;

    @Test
    void getVisibilityMapByMarketplaceSlug_shouldReturnEmptyMap_whenSlugIsEmpty() {
        Map<Long, Boolean> result = service.getVisibilityMapByMarketplaceSlug("   ");
        assertTrue(result.isEmpty());
    }

    @Test
    void getVisibilityMapByMarketplaceSlug_shouldReturnMap() {
        Content content1 = new Content();
        content1.setId(1L);
        ContentVisibility v1 = new ContentVisibility();
        v1.setContent(content1);
        v1.setVisible(true);

        Content content2 = new Content();
        content2.setId(2L);
        ContentVisibility v2 = new ContentVisibility();
        v2.setContent(content2);
        v2.setVisible(false);

        Content content3 = new Content(); // no id
        ContentVisibility v3 = new ContentVisibility();
        v3.setContent(content3);
        
        ContentVisibility v4 = new ContentVisibility(); // null content

        when(contentVisibilityRepository.findByMarketplace_Bank_Slug("myslug"))
                .thenReturn(List.of(v1, v2, v3, v4));

        Map<Long, Boolean> result = service.getVisibilityMapByMarketplaceSlug(" MySlug ");

        assertEquals(2, result.size());
        assertTrue(result.get(1L));
        assertFalse(result.get(2L));
    }

    @Test
    void isVisibleForMarketplace_shouldReturnTrue_whenContentOrIdOrSlugIsEmpty() {
        assertTrue(service.isVisibleForMarketplace(null, "slug"));
        assertTrue(service.isVisibleForMarketplace(new Content(), "slug")); // id is null
        
        Content content = new Content();
        content.setId(1L);
        assertTrue(service.isVisibleForMarketplace(content, "   "));
        assertTrue(service.isVisibleForMarketplace(content, null));
    }

    @Test
    void isVisibleForMarketplace_shouldReturnVisibilityValue_whenFound() {
        Content content = new Content();
        content.setId(1L);
        ContentVisibility v = new ContentVisibility();
        v.setVisible(false);

        when(contentVisibilityRepository.findByMarketplace_Bank_SlugAndContent_Id("slug", 1L))
                .thenReturn(Optional.of(v));

        assertFalse(service.isVisibleForMarketplace(content, " Slug "));
    }

    @Test
    void isVisibleForMarketplace_shouldReturnTrue_whenVisibilityValueIsNull() {
        Content content = new Content();
        content.setId(1L);
        ContentVisibility v = new ContentVisibility();
        v.setVisible(null);

        when(contentVisibilityRepository.findByMarketplace_Bank_SlugAndContent_Id("slug", 1L))
                .thenReturn(Optional.of(v));

        assertTrue(service.isVisibleForMarketplace(content, " slug "));
    }

    @Test
    void isVisibleForMarketplace_shouldReturnTrue_whenNotFound() {
        Content content = new Content();
        content.setId(1L);

        when(contentVisibilityRepository.findByMarketplace_Bank_SlugAndContent_Id("slug", 1L))
                .thenReturn(Optional.empty());

        assertTrue(service.isVisibleForMarketplace(content, "slug"));
    }

    @Test
    void updateVisibility_shouldThrowException_whenContentIdIsNull() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(null, "slug", true));
        assertEquals("Le contenu selectionne est introuvable.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenSlugIsEmpty() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, "   ", true));
        assertEquals("La marketplace selectionnee est introuvable.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenContentNotFound() {
        when(contentRepository.findById(1L)).thenReturn(Optional.empty());
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, "slug", true));
        assertEquals("Le contenu selectionne est introuvable.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenMarketplaceNotFound() {
        Content content = new Content();
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.empty());
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, " Slug ", true));
        assertEquals("La marketplace selectionnee est introuvable.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenContentStoreIsNull() {
        Content content = new Content();
        Marketplace marketplace = new Marketplace();
        
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, "slug", true));
        assertEquals("Le contenu selectionne n'appartient pas a votre marketplace.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenMarketplaceStoresIsNull() {
        Content content = new Content();
        Store store = new Store();
        content.setStore(store);
        
        Marketplace marketplace = new Marketplace();
        marketplace.setMarketplaceStores(null);
        
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, "slug", true));
        assertEquals("Le contenu selectionne n'appartient pas a votre marketplace.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldThrowException_whenStoreNotBelongToMarketplace() {
        Store store = new Store();
        store.setId(10L);
        Content content = new Content();
        content.setStore(store);
        
        Store otherStore = new Store();
        otherStore.setId(20L);
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(otherStore);
        
        Marketplace marketplace = new Marketplace();
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> service.updateVisibility(1L, "slug", true));
        assertEquals("Le contenu selectionne n'appartient pas a votre marketplace.", ex.getMessage());
    }

    @Test
    void updateVisibility_shouldSaveNewVisibility_whenNotExists() {
        Store store = new Store();
        store.setId(10L);
        Content content = new Content();
        content.setId(1L);
        content.setStore(store);
        
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(store);
        Marketplace marketplace = new Marketplace();
        marketplace.setId(100L);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        when(contentVisibilityRepository.findByMarketplace_IdAndContent_Id(100L, 1L))
                .thenReturn(Optional.empty());
                
        ContentVisibility savedVisibility = new ContentVisibility();
        savedVisibility.setVisible(true);
        when(contentVisibilityRepository.save(any(ContentVisibility.class))).thenReturn(savedVisibility);

        ContentVisibility result = service.updateVisibility(1L, "slug", true);

        assertEquals(true, result.getVisible());
        verify(contentVisibilityRepository).save(argThat(v -> 
            v.getVisible() == true && 
            v.getContent() == content && 
            v.getMarketplace() == marketplace
        ));
    }
    
    @Test
    void updateVisibility_shouldUpdateExistingVisibility_whenExists() {
        Store store = new Store();
        store.setId(10L);
        Content content = new Content();
        content.setId(1L);
        content.setStore(store);
        
        MarketplaceStore marketplaceStore = new MarketplaceStore();
        marketplaceStore.setStore(store);
        Marketplace marketplace = new Marketplace();
        marketplace.setId(100L);
        marketplace.setMarketplaceStores(List.of(marketplaceStore));
        
        ContentVisibility existingVisibility = new ContentVisibility();
        existingVisibility.setVisible(true);
        
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content));
        when(marketplaceRepository.findByBank_Slug("slug")).thenReturn(Optional.of(marketplace));
        when(contentVisibilityRepository.findByMarketplace_IdAndContent_Id(100L, 1L))
                .thenReturn(Optional.of(existingVisibility));
                
        when(contentVisibilityRepository.save(any(ContentVisibility.class))).thenAnswer(i -> i.getArgument(0));

        ContentVisibility result = service.updateVisibility(1L, "slug", false);

        assertEquals(false, result.getVisible());
        verify(contentVisibilityRepository).save(existingVisibility);
    }
}
