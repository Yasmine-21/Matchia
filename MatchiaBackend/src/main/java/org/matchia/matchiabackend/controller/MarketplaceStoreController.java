package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.MarketplaceStoreDto;
import org.matchia.matchiabackend.entity.MarketplaceStore;
import org.matchia.matchiabackend.mapper.MarketplaceStoreMapper;
import org.matchia.matchiabackend.service.MarketplaceStoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/marketplace-stores")
public class MarketplaceStoreController {

    private final MarketplaceStoreService service;
    private final MarketplaceStoreMapper mapper;

    public MarketplaceStoreController(MarketplaceStoreService service, MarketplaceStoreMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<MarketplaceStoreDto> create(@RequestBody MarketplaceStoreDto dto) {
        try {
            MarketplaceStore savedEntity = service.create(dto);
            return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<List<MarketplaceStoreDto>> getAll() {
        List<MarketplaceStoreDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MarketplaceStoreDto> getById(@PathVariable Long id) {
        Optional<MarketplaceStore> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MarketplaceStoreDto> update(@PathVariable Long id, @RequestBody MarketplaceStoreDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        try {
            MarketplaceStore updatedEntity = service.update(id, dto);
            return new ResponseEntity<>(mapper.toDto(updatedEntity), HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        service.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
