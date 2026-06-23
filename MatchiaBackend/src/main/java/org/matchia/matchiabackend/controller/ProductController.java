package org.matchia.matchiabackend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.matchia.matchiabackend.dto.ProductDto;
import org.matchia.matchiabackend.dto.ProductParameterValueRequestDto;
import org.matchia.matchiabackend.dto.ProductRequestDto;
import org.matchia.matchiabackend.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/bank/{bankId}")
    public ResponseEntity<List<ProductDto>> getByBank(@PathVariable Long bankId) {
        try {
            return ResponseEntity.ok(service.getByBank(bankId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<ProductDto>> getByStore(@PathVariable Long storeId) {
        try {
            return ResponseEntity.ok(service.getByStore(storeId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<ProductDto> create(@RequestBody ProductRequestDto request) {
        try {
            return new ResponseEntity<>(service.create(request), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDto> createMultipart(
            @RequestParam("bankId") Long bankId,
            @RequestParam("storeId") Long storeId,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "parameterValues", required = false) String parameterValuesJson
    ) {
        try {
            ProductRequestDto request = buildRequest(bankId, storeId, name, description, price, parameterValuesJson);
            return new ResponseEntity<>(service.create(request, image), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDto> update(
            @PathVariable Long id,
            @RequestBody ProductRequestDto request) {
        try {
            return ResponseEntity.ok(service.update(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDto> updateMultipart(
            @PathVariable Long id,
            @RequestParam("bankId") Long bankId,
            @RequestParam("storeId") Long storeId,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "parameterValues", required = false) String parameterValuesJson
    ) {
        try {
            ProductRequestDto request = buildRequest(bankId, storeId, name, description, price, parameterValuesJson);
            return ResponseEntity.ok(service.update(id, request, image));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private ProductRequestDto buildRequest(
            Long bankId,
            Long storeId,
            String name,
            String description,
            String price,
            String parameterValuesJson
    ) throws IOException {
        ProductRequestDto request = new ProductRequestDto();
        request.setBankId(bankId);
        request.setStoreId(storeId);
        request.setName(name);
        request.setDescription(description);
        if (price != null && !price.isBlank()) {
            request.setPrice(new BigDecimal(price));
        }

        if (parameterValuesJson != null && !parameterValuesJson.isBlank()) {
            List<ProductParameterValueRequestDto> parameterValues = objectMapper.readValue(
                    parameterValuesJson,
                    new TypeReference<>() {}
            );
            request.setParameterValues(parameterValues);
        }

        return request;
    }
}
