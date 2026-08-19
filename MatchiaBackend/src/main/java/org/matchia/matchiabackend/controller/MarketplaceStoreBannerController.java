package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceStoreBannerDto;
import org.matchia.matchiabackend.service.MarketplaceStoreBannerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Bank-backoffice configuration endpoints for a store-specific banner. */
@RestController
@RequestMapping("/api/bank/marketplace-stores")
@RequiredArgsConstructor
public class MarketplaceStoreBannerController {

    private final MarketplaceStoreBannerService service;

    @GetMapping("/{marketplaceStoreId}/banner")
    public ResponseEntity<MarketplaceStoreBannerDto> getBanner(
            Authentication authentication,
            @PathVariable Long marketplaceStoreId
    ) {
        return ResponseEntity.ok(service.getBanner(authentication, marketplaceStoreId));
    }

    @PostMapping(value = "/{marketplaceStoreId}/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MarketplaceStoreBannerDto> replaceBanner(
            Authentication authentication,
            @PathVariable Long marketplaceStoreId,
            @RequestParam("banner") MultipartFile banner
    ) throws IOException {
        return ResponseEntity.ok(service.replaceBanner(authentication, marketplaceStoreId, banner));
    }
}
