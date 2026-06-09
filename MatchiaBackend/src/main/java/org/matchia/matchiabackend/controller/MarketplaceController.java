package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.MarketplaceConfigDto;
import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.mapper.MarketplaceMapper;
import org.matchia.matchiabackend.service.MarketplaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/marketplaces")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MarketplaceController {

    private final MarketplaceService service;
    private final MarketplaceMapper mapper;

    @GetMapping
    public ResponseEntity<List<MarketplaceDto>> getAllMarketplaces() {
        List<MarketplaceDto> marketplaces = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(marketplaces);
    }

    @GetMapping("/public/slug/{slug}")
    public ResponseEntity<MarketplaceDto> getPublicMarketplaceBySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(mapper::toDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    public ResponseEntity<MarketplaceDto> configureMarketplace(@RequestBody MarketplaceConfigDto dto) {
        try {
            Marketplace saved = service.configureMarketplace(dto);
            return new ResponseEntity<>(mapper.toDto(saved), HttpStatus.CREATED);
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping(value = "/upload-banniere", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadBanniere(@RequestParam("banniere") MultipartFile banniere) {
        try {
            String banniereUrl = service.saveBanniere(banniere);
            return ResponseEntity.ok(Map.of("banniereUrl", banniereUrl));
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<MarketplaceDto> updateMarketplace(@PathVariable Long id, @RequestBody MarketplaceConfigDto dto) {
        try {
            Marketplace saved = service.updateMarketplace(id, dto);
            return ResponseEntity.ok(mapper.toDto(saved));
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MarketplaceDto> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String statusValue = payload != null ? payload.get("status") : null;
            if (statusValue == null || statusValue.isBlank()) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            MarketplaceStatusEnum status = MarketplaceStatusEnum.valueOf(statusValue.trim().toLowerCase());
            Marketplace saved = service.updateStatus(id, status);
            return ResponseEntity.ok(mapper.toDto(saved));
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMarketplace(@PathVariable Long id) {
        try {
            service.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}
