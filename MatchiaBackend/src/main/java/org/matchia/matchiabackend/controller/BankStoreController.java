package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankStoreDto;
import org.matchia.matchiabackend.entity.BankStore;
import org.matchia.matchiabackend.mapper.BankStoreMapper;
import org.matchia.matchiabackend.service.BankStoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bankstores")
public class BankStoreController {

    private final BankStoreService service;
    private final BankStoreMapper mapper;

    public BankStoreController(BankStoreService service, BankStoreMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<BankStoreDto> create(@RequestBody BankStoreDto dto) {
        BankStore entity = mapper.toEntity(dto);
        BankStore savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankStoreDto>> getAll() {
        List<BankStoreDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankStoreDto> getById(@PathVariable Long id) {
        Optional<BankStore> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankStoreDto> update(@PathVariable Long id, @RequestBody BankStoreDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        BankStore entity = mapper.toEntity(dto);
        entity.setId(id);
        BankStore updatedEntity = service.save(entity);
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
