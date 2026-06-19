package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ContentDto;
import org.matchia.matchiabackend.service.ContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/contents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ContentController {

    private final ContentService contentService;

    @GetMapping
    public ResponseEntity<List<ContentDto>> getAllContents() {
        return ResponseEntity.ok(contentService.getAllContents());
    }

    @GetMapping("/marketplace/{marketplaceSlug}")
    public ResponseEntity<List<ContentDto>> getContentsByMarketplace(@PathVariable String marketplaceSlug) {
        return ResponseEntity.ok(contentService.getContentsByMarketplaceSlug(marketplaceSlug));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ContentDto> createContent(
            @RequestParam("storeId") Long storeId,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "marketplaceSlug", required = false) String marketplaceSlug,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(contentService.createContent(storeId, title, description, status, marketplaceSlug, image));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ContentDto> updateContent(
            @PathVariable Long id,
            @RequestParam("storeId") Long storeId,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "marketplaceSlug", required = false) String marketplaceSlug,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        try {
            return ResponseEntity.ok(contentService.updateContent(id, storeId, title, description, status, marketplaceSlug, image));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContent(@PathVariable Long id) {
        try {
            contentService.deleteContent(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
