package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.enums.DealerRequestStatusEnum;
import org.matchia.matchiabackend.service.DealerAccountService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/saas/dealers")
@RequiredArgsConstructor
public class SaasDealerController {
    private final DealerAccountService service;

    @GetMapping("/requests")
    public Page<DealerDtos.AccountRequestView> requests(Authentication auth,
            @RequestParam(required = false) DealerRequestStatusEnum status,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            Pageable pageable) {
        return service.search(auth, status, search, storeId, from, to, pageable);
    }

    @PutMapping("/requests/{id}/approve")
    public DealerDtos.DealerView approve(Authentication auth, @PathVariable Long id) { return service.approve(auth, id); }

    @PutMapping("/requests/{id}/reject")
    public DealerDtos.AccountRequestView reject(Authentication auth, @PathVariable Long id,
                                                 @RequestBody DealerDtos.DecisionRequest request) {
        return service.reject(auth, id, request.reason());
    }

    @GetMapping("/requests/{id}/documents/{index}")
    public ResponseEntity<Resource> document(Authentication auth, @PathVariable Long id, @PathVariable int index) {
        Path file = service.document(auth, id, index);
        String contentType;
        try { contentType = Files.probeContentType(file); }
        catch (Exception ignored) { contentType = null; }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFileName() + "\"")
                .body(new FileSystemResource(file));
    }
}
