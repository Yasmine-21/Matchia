package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceContentDto;
import org.matchia.matchiabackend.service.MarketplaceContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/marketplace-contents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MarketplaceContentController {

    private final MarketplaceContentService marketplaceContentService;

    @GetMapping
    public ResponseEntity<List<MarketplaceContentDto>> getAllContents() {
        return ResponseEntity.ok(marketplaceContentService.getAllContents());
    }

    @GetMapping("/marketplace/{marketplaceSlug}")
    public ResponseEntity<List<MarketplaceContentDto>> getContentsByMarketplace(@PathVariable String marketplaceSlug) {
        return ResponseEntity.ok(marketplaceContentService.getContentsByMarketplaceSlug(marketplaceSlug));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MarketplaceContentDto> createContent(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("marketplaceSlug") String marketplaceSlug,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(marketplaceContentService.createContent(storeId, title, description, status, marketplaceSlug, image));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MarketplaceContentDto> updateContent(
            @PathVariable Long id,
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("marketplaceSlug") String marketplaceSlug,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        try {
            return ResponseEntity.ok(marketplaceContentService.updateContent(id, storeId, title, description, status, marketplaceSlug, image));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContent(
            @PathVariable Long id,
            @RequestParam("marketplaceSlug") String marketplaceSlug
    ) {
        try {
            marketplaceContentService.deleteContent(id, marketplaceSlug);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
