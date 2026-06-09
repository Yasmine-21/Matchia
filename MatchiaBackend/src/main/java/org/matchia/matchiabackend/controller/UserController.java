package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.dto.UserDto;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.mapper.UserMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service;
    private final UserMapper mapper;
    private final BankRepository bankRepository;

    public UserController(UserService service, UserMapper mapper, BankRepository bankRepository) {
        this.service = service;
        this.mapper = mapper;
        this.bankRepository = bankRepository;
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@RequestBody UserDto dto) {
        User entity = mapper.toEntity(dto);
        Bank bank = resolveBank(dto.getBankId());
        if (bank == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        entity.setBank(bank);
        if (entity.getRole() == null) {
            entity.setRole(org.matchia.matchiabackend.entity.enums.RoleEnum.ADMIN);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(org.matchia.matchiabackend.entity.enums.UserStatusEnum.active);
        }
        User savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getAll() {
        List<UserDto> list = service.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable Long id) {
        Optional<User> entity = service.findById(id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> update(@PathVariable Long id, @RequestBody UserDto dto) {
        Optional<User> existingUser = service.findById(id);
        if (existingUser.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        User entity = existingUser.get();
        Bank bank = resolveBank(dto.getBankId());
        if (bank == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        entity.setBank(bank);
        if (dto.getFullName() != null) {
            entity.setFullName(dto.getFullName());
        }
        if (dto.getEmail() != null) {
            entity.setEmail(dto.getEmail());
        }
        if (dto.getPhone() != null) {
            entity.setPhone(dto.getPhone());
        }
        if (dto.getContactImageUrl() != null) {
            entity.setContactImageUrl(dto.getContactImageUrl());
        }
        if (dto.getRole() != null) {
            entity.setRole(dto.getRole());
        }
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            entity.setPassword(dto.getPassword());
        }

        User updatedEntity = service.save(entity);
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

    private Bank resolveBank(Long bankId) {
        if (bankId == null) {
            return null;
        }
        return bankRepository.findById(bankId).orElse(null);
    }
}
