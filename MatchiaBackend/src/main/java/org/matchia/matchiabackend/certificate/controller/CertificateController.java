package org.matchia.matchiabackend.certificate.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.certificate.service.CertificateService;
import org.matchia.matchiabackend.dto.CertificateDto;
import org.matchia.matchiabackend.dto.CertificateHistoryDto;
import org.matchia.matchiabackend.dto.CertificateRequestDto;
import org.matchia.matchiabackend.dto.CertificateRevokeRequestDto;
import org.matchia.matchiabackend.dto.CertificateTestResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/certificates")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping
    public ResponseEntity<List<CertificateDto>> findAll() {
        return ResponseEntity.ok(certificateService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CertificateDto> findById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(certificateService.findById(id));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<CertificateHistoryDto>> history(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(certificateService.history(id));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/issue")
    public ResponseEntity<CertificateDto> issue(@Valid @RequestBody CertificateRequestDto request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.issue(request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<CertificateDto> importCertificate(@Valid @RequestBody CertificateRequestDto request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.importCertificate(request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<CertificateDto> activate(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(certificateService.activate(id));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<CertificateTestResponseDto> test(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(certificateService.test(id));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/rotate")
    public ResponseEntity<CertificateDto> rotate(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(certificateService.rotate(id));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<CertificateDto> revoke(
            @PathVariable Long id,
            @Valid @RequestBody CertificateRevokeRequestDto request
    ) {
        try {
            return ResponseEntity.ok(certificateService.revoke(id, request));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return ResponseEntity.badRequest().build();
        }
    }
}
