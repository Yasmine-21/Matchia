package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankStoreModuleDto;
import org.matchia.matchiabackend.entity.BankStoreModule;
import org.matchia.matchiabackend.mapper.BankStoreModuleMapper;
import org.matchia.matchiabackend.service.BankStoreModuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bankstoremodules")
public class BankStoreModuleController {

    private final BankStoreModuleService service;
    private final BankStoreModuleMapper mapper;

    public BankStoreModuleController(BankStoreModuleService service, BankStoreModuleMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<BankStoreModuleDto> create(@RequestBody BankStoreModuleDto dto) {
        BankStoreModule entity = mapper.toEntity(dto);
        BankStoreModule savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankStoreModuleDto>> getAll() {
        List<BankStoreModuleDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankStoreModuleDto> getById(@PathVariable Long id) {
        Optional<BankStoreModule> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankStoreModuleDto> update(@PathVariable Long id, @RequestBody BankStoreModuleDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        BankStoreModule entity = mapper.toEntity(dto);
        entity.setId(id);
        BankStoreModule updatedEntity = service.save(entity);
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
