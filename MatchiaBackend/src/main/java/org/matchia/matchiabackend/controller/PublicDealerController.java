package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.service.DealerAccountService;
import org.matchia.matchiabackend.service.DealerPartnershipService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.nio.file.Path;
import java.net.MalformedURLException;

@RestController
@RequestMapping("/api/public/dealers")
@RequiredArgsConstructor
public class PublicDealerController {
    private final DealerAccountService accountService;
    private final DealerPartnershipService partnershipService;
    private final DealerProductService productService;

    @GetMapping
    public List<DealerDtos.PublicDealerView> activeDealers() {
        return accountService.activePublicDealers();
    }

    @GetMapping("/marketplaces/{bankSlug}")
    public List<DealerDtos.PublicDealerView> marketplaceDealers(@PathVariable String bankSlug) {
        return partnershipService.publicActiveDealersForBank(bankSlug);
    }

    @PostMapping(value = "/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DealerDtos.AccountRequestView register(
            @Valid @RequestPart("data") DealerDtos.RegistrationRequest request,
            @RequestPart("logo") MultipartFile logo,
            @RequestPart(value = "contactPhoto", required = false) MultipartFile contactPhoto,
            @RequestPart("documents") List<MultipartFile> documents) {
        return accountService.register(request, logo, contactPhoto, documents);
    }

    @GetMapping("/marketplaces/{bankSlug}/stores/{storeId}/products")
    public List<DealerDtos.ProductView> marketplaceProducts(@PathVariable String bankSlug, @PathVariable Long storeId) {
        return productService.publicProducts(bankSlug, storeId);
    }

    @GetMapping("/products/{productId}/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadPublicProductDocument(@PathVariable Long productId, @PathVariable Long documentId) throws MalformedURLException {
        Path path = productService.publicDocument(productId, documentId);
        Resource resource = new UrlResource(path.toUri());
        MediaType contentType = MediaTypeFactory.getMediaType(path.getFileName().toString())
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + path.getFileName() + "\"").body(resource);
    }
}
