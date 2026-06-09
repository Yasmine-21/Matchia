package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.MarketplaceDto;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.mapper.MarketplaceMapper;
import org.matchia.matchiabackend.service.MarketplaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bankbrandings")
public class LegacyMarketplaceController {

    private final MarketplaceService service;
    private final MarketplaceMapper mapper;

    public LegacyMarketplaceController(MarketplaceService service, MarketplaceMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<MarketplaceDto> create(@RequestBody MarketplaceDto dto) {
        Marketplace entity = mapper.toEntity(dto);
        Marketplace savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<MarketplaceDto>> getAll() {
        List<MarketplaceDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MarketplaceDto> getById(@PathVariable Long id) {
        Optional<Marketplace> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MarketplaceDto> update(@PathVariable Long id, @RequestBody MarketplaceDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        Marketplace entity = mapper.toEntity(dto);
        entity.setId(id);
        Marketplace updatedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(updatedEntity), HttpStatus.OK);
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
