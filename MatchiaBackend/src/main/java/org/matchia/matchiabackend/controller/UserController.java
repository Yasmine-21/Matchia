package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.dto.UserDto;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.mapper.UserMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.service.UserService;
import org.matchia.matchiabackend.service.PasswordService;
import org.matchia.matchiabackend.service.DealerSecurityService;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service;
    private final UserMapper mapper;
    private final BankRepository bankRepository;
    private final PasswordService passwordService;
    private final DealerSecurityService dealerSecurityService;

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    public UserController(UserService service, UserMapper mapper, BankRepository bankRepository,
                          PasswordService passwordService, DealerSecurityService dealerSecurityService) {
        this.service = service;
        this.mapper = mapper;
        this.bankRepository = bankRepository;
        this.passwordService = passwordService;
        this.dealerSecurityService = dealerSecurityService;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody UserDto dto, Authentication authentication) {
        User currentUser = dealerSecurityService.currentUser(authentication);
        if (currentUser.getRole() != RoleEnum.ADMIN_SAAS && currentUser.getRole() != RoleEnum.ADMIN_BANK) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        if (currentUser.getRole() == RoleEnum.ADMIN_SAAS && dto.getRole() == RoleEnum.CLIENT) {
            return ResponseEntity.badRequest().body(Map.of("message", "Les clients sont crees depuis l'inscription de la marketplace."));
        }
        if (currentUser.getRole() == RoleEnum.ADMIN_BANK
                && dto.getRole() != null
                && dto.getRole() != RoleEnum.ADMIN_BANK
                && dto.getRole() != RoleEnum.CLIENT) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        String encodedPassword;
        try {
            encodedPassword = passwordService.encode(dto.getPassword());
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
        User entity = mapper.toEntity(dto);
        Bank bank = currentUser.getRole() == RoleEnum.ADMIN_BANK ? currentUser.getBank() : resolveBank(dto.getBankId());
        if (bank == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "La banque selectionnee est introuvable."));
        }
        entity.setBank(bank);
        if (entity.getRole() == null) {
            entity.setRole(org.matchia.matchiabackend.entity.enums.RoleEnum.ADMIN_BANK);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(org.matchia.matchiabackend.entity.enums.UserStatusEnum.active);
        }
        if (dto.getAddress() != null) {
            entity.setAddress(dto.getAddress());
        }
        entity.setPassword(encodedPassword);
        User savedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(savedEntity), HttpStatus.CREATED);
    }

    @PostMapping(value = "/upload-contact-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadContactImage(@RequestParam("contactImage") MultipartFile contactImage) {
        try {
            String contactImageUrl = saveContactImage(contactImage);
            return ResponseEntity.ok(Map.of("contactImageUrl", contactImageUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de l'upload de l'image."));
        }
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getAll(Authentication authentication) {
        User currentUser = dealerSecurityService.currentUser(authentication);
        if (currentUser.getRole() == RoleEnum.ADMIN_SAAS) {
            return ResponseEntity.ok(service.findAllForSaasBackoffice().stream()
                    .map(mapper::toDto)
                    .collect(Collectors.toList()));
        }
        if (currentUser.getRole() == RoleEnum.ADMIN_BANK && currentUser.getBank() != null) {
            return ResponseEntity.ok(service.findAllForBankBackoffice(currentUser.getBank().getId()).stream()
                    .map(mapper::toDto)
                    .collect(Collectors.toList()));
        }
        if (currentUser.getRole() == RoleEnum.DEALER_ADMIN) {
            return ResponseEntity.ok(List.of(mapper.toDto(currentUser)));
        }
        return new ResponseEntity<>(HttpStatus.FORBIDDEN);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable Long id, Authentication authentication) {
        Optional<User> entity = findUserVisibleTo(dealerSecurityService.currentUser(authentication), id);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UserDto dto, Authentication authentication) {
        User currentUser = dealerSecurityService.currentUser(authentication);
        Optional<User> existingUser = findUserVisibleTo(currentUser, id);
        if (existingUser.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        User entity = existingUser.get();
        Bank bank = entity.getBank();
        if (currentUser.getRole() == RoleEnum.ADMIN_BANK
                && dto.getBankId() != null
                && !dto.getBankId().equals(bank != null ? bank.getId() : null)) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        if (currentUser.getRole() == RoleEnum.ADMIN_SAAS && dto.getBankId() != null) {
            bank = resolveBank(dto.getBankId());
            if (bank == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "La banque selectionnee est introuvable."));
            }
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
        if (dto.getAddress() != null) {
            entity.setAddress(dto.getAddress());
        }
        if (dto.getContactImageUrl() != null) {
            entity.setContactImageUrl(dto.getContactImageUrl());
        }
        if (dto.getRole() == RoleEnum.CLIENT && currentUser.getRole() == RoleEnum.ADMIN_SAAS) {
            return ResponseEntity.badRequest().body(Map.of("message", "Les comptes clients ne sont pas geres depuis le backoffice SaaS."));
        }
        if (dto.getRole() != null && currentUser.getRole() == RoleEnum.ADMIN_BANK
                && dto.getRole() != RoleEnum.ADMIN_BANK && dto.getRole() != RoleEnum.CLIENT) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        if (dto.getRole() != null && currentUser.getRole() != RoleEnum.DEALER_ADMIN) {
            entity.setRole(dto.getRole());
        }
        if (dto.getStatus() != null && currentUser.getRole() != RoleEnum.DEALER_ADMIN) {
            entity.setStatus(dto.getStatus());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            try {
                entity.setPassword(passwordService.encode(dto.getPassword()));
            } catch (IllegalArgumentException exception) {
                return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
            }
        }

        User updatedEntity = service.save(entity);
        return new ResponseEntity<>(mapper.toDto(updatedEntity), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User currentUser = dealerSecurityService.currentUser(authentication);
        if (currentUser.getRole() != RoleEnum.ADMIN_SAAS && currentUser.getRole() != RoleEnum.ADMIN_BANK) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        Optional<User> existingUser = findUserVisibleTo(currentUser, id);
        if (existingUser.isEmpty()) {
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

    private Optional<User> findUserVisibleTo(User currentUser, Long userId) {
        if (currentUser.getRole() == RoleEnum.ADMIN_SAAS) {
            return service.findDetailedForSaasBackoffice(userId);
        }
        if (currentUser.getRole() == RoleEnum.ADMIN_BANK && currentUser.getBank() != null) {
            return service.findDetailedForBankBackoffice(userId, currentUser.getBank().getId());
        }
        if (currentUser.getRole() == RoleEnum.DEALER_ADMIN && currentUser.getId().equals(userId)) {
            return Optional.of(currentUser);
        }
        return Optional.empty();
    }

    private String saveContactImage(MultipartFile contactImage) throws IOException {
        if (contactImage == null || contactImage.isEmpty()) {
            throw new IllegalArgumentException("L'image du contact est obligatoire.");
        }

        String contentType = contactImage.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("L'image du contact doit etre une image.");
        }

        String original = contactImage.getOriginalFilename();
        String extension = original != null && original.contains(".")
                ? original.substring(original.lastIndexOf("."))
                : "";
        String filename = UUID.randomUUID() + extension;
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        Files.copy(contactImage.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/logos/" + filename;
    }
}
