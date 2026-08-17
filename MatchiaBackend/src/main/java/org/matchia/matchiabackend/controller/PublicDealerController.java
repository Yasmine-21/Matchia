package org.matchia.matchiabackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.service.DealerAccountService;
import org.matchia.matchiabackend.service.DealerProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/public/dealers")
@RequiredArgsConstructor
public class PublicDealerController {
    private final DealerAccountService accountService;
    private final DealerProductService productService;

    @GetMapping
    public List<DealerDtos.PublicDealerView> activeDealers() {
        return accountService.activePublicDealers();
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
}
