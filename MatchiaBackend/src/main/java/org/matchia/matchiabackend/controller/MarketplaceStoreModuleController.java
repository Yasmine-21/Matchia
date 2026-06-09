package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.MarketplaceStoreModuleDto;
import org.matchia.matchiabackend.entity.MarketplaceStoreModule;
import org.matchia.matchiabackend.mapper.MarketplaceStoreModuleMapper;
import org.matchia.matchiabackend.service.MarketplaceStoreModuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/marketplace-store-modules")
public class MarketplaceStoreModuleController {

    private final MarketplaceStoreModuleService service;
    private final MarketplaceStoreModuleMapper mapper;

    public MarketplaceStoreModuleController(MarketplaceStoreModuleService service, MarketplaceStoreModuleMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<MarketplaceStoreModuleDto> create(@RequestBody MarketplaceStoreModuleDto dto) {
        try {
            MarketplaceStoreModule savedEntity = service.create(dto);
            return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (NoSuchElementException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<List<MarketplaceStoreModuleDto>> getAll() {
        List<MarketplaceStoreModuleDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MarketplaceStoreModuleDto> getById(@PathVariable Long id) {
        Optional<MarketplaceStoreModule> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MarketplaceStoreModuleDto> update(@PathVariable Long id, @RequestBody MarketplaceStoreModuleDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        try {
            MarketplaceStoreModule updatedEntity = service.update(id, dto);
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
