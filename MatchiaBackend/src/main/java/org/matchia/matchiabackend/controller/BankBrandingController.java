package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankBrandingDto;
import org.matchia.matchiabackend.entity.BankBranding;
import org.matchia.matchiabackend.mapper.BankBrandingMapper;
import org.matchia.matchiabackend.service.BankBrandingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bankbrandings")
public class BankBrandingController {

    private final BankBrandingService service;
    private final BankBrandingMapper mapper;

    public BankBrandingController(BankBrandingService service, BankBrandingMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<BankBrandingDto> create(@RequestBody BankBrandingDto dto) {
        BankBranding entity = mapper.toEntity(dto);
        BankBranding savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankBrandingDto>> getAll() {
        List<BankBrandingDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankBrandingDto> getById(@PathVariable Long id) {
        Optional<BankBranding> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankBrandingDto> update(@PathVariable Long id, @RequestBody BankBrandingDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        BankBranding entity = mapper.toEntity(dto);
        entity.setId(id);
        BankBranding updatedEntity = service.save(entity);
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
