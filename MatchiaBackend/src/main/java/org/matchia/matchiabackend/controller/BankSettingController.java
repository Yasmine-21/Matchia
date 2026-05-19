package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankSettingDto;
import org.matchia.matchiabackend.entity.BankSetting;
import org.matchia.matchiabackend.mapper.BankSettingMapper;
import org.matchia.matchiabackend.service.BankSettingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/banksettings")
public class BankSettingController {

    private final BankSettingService service;
    private final BankSettingMapper mapper;

    public BankSettingController(BankSettingService service, BankSettingMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<BankSettingDto> create(@RequestBody BankSettingDto dto) {
        BankSetting entity = mapper.toEntity(dto);
        BankSetting savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankSettingDto>> getAll() {
        List<BankSettingDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankSettingDto> getById(@PathVariable Long id) {
        Optional<BankSetting> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankSettingDto> update(@PathVariable Long id, @RequestBody BankSettingDto dto) {
        if (service.findById(id).isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        BankSetting entity = mapper.toEntity(dto);
        entity.setId(id);
        BankSetting updatedEntity = service.save(entity);
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
