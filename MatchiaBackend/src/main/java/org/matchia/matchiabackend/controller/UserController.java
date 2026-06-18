package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.dto.UserDto;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.mapper.UserMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.service.UserService;
import org.matchia.matchiabackend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
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

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service;
    private final UserMapper mapper;
    private final BankRepository bankRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    public UserController(UserService service, UserMapper mapper, BankRepository bankRepository, JwtUtil jwtUtil) {
        this.service = service;
        this.mapper = mapper;
        this.bankRepository = bankRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@RequestBody UserDto dto, HttpServletRequest request) {
        User entity = mapper.toEntity(dto);
        Bank bank = resolveBank(dto.getBankId());
        if (bank == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        String tenantBankSlug = resolveTenantBankSlug(request);
        if (tenantBankSlug != null && (bank.getSlug() == null || !tenantBankSlug.equals(bank.getSlug()))) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        entity.setBank(bank);
        if (entity.getRole() == null) {
            entity.setRole(org.matchia.matchiabackend.entity.enums.RoleEnum.ADMIN_BANK);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(org.matchia.matchiabackend.entity.enums.UserStatusEnum.active);
        }
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
    public ResponseEntity<List<UserDto>> getAll(HttpServletRequest request) {
        String tenantBankSlug = resolveTenantBankSlug(request);
        List<UserDto> list = service.findAllByBankSlug(tenantBankSlug).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new ResponseEntity<>(list, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable Long id, HttpServletRequest request) {
        String tenantBankSlug = resolveTenantBankSlug(request);
        Optional<User> entity = service.findDetailedByIdAndBankSlug(id, tenantBankSlug);
        return entity.map(value -> new ResponseEntity<>(mapper.toDto(value), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> update(@PathVariable Long id, @RequestBody UserDto dto, HttpServletRequest request) {
        String tenantBankSlug = resolveTenantBankSlug(request);
        Optional<User> existingUser = service.findDetailedByIdAndBankSlug(id, tenantBankSlug);
        if (existingUser.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        User entity = existingUser.get();
        Bank bank = resolveBank(dto.getBankId());
        if (bank == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        if (tenantBankSlug != null && (bank.getSlug() == null || !tenantBankSlug.equals(bank.getSlug()))) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
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
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        String tenantBankSlug = resolveTenantBankSlug(request);
        Optional<User> existingUser = service.findDetailedByIdAndBankSlug(id, tenantBankSlug);
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

    private String resolveTenantBankSlug(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                if (jwtUtil.validateToken(token)) {
                    String bankSlug = jwtUtil.extractAllClaims(token).get("bankSlug", String.class);
                    if (bankSlug != null && !bankSlug.isBlank()) {
                        return bankSlug.trim();
                    }
                }
            } catch (Exception ignored) {
                // Fallback to custom headers below.
            }
        }

        String headerBankSlug = request.getHeader("X-Bank-Slug");
        if (headerBankSlug != null && !headerBankSlug.isBlank()) {
            return headerBankSlug.trim();
        }

        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            try {
                java.net.URI originUri = java.net.URI.create(origin.trim());
                String host = originUri.getHost();
                if (host != null && !host.isBlank()) {
                    if (!host.equalsIgnoreCase("localhost") && !host.matches("^[0-9.]+$")) {
                        String[] parts = host.split("\\.");
                        if (parts.length >= 3 && !"www".equalsIgnoreCase(parts[0])) {
                            return parts[0];
                        }
                    }
                }
            } catch (Exception ignored) {
                // ignore malformed origin
            }
        }

        return null;
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
