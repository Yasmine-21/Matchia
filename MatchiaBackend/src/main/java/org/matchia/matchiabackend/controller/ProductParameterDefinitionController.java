package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.ProductParameterDefinitionDto;
import org.matchia.matchiabackend.dto.ProductParameterDefinitionRequestDto;
import org.matchia.matchiabackend.service.ProductParameterDefinitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/product-parameter-definitions")
@CrossOrigin(origins = "*")
public class ProductParameterDefinitionController {

    private final ProductParameterDefinitionService service;

    public ProductParameterDefinitionController(ProductParameterDefinitionService service) {
        this.service = service;
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<ProductParameterDefinitionDto>> getByStore(@PathVariable Long storeId) {
        try {
            return ResponseEntity.ok(service.getByStore(storeId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<ProductParameterDefinitionDto> create(@RequestBody ProductParameterDefinitionRequestDto request) {
        try {
            return new ResponseEntity<>(service.create(request), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductParameterDefinitionDto> update(
            @PathVariable Long id,
            @RequestBody ProductParameterDefinitionRequestDto request) {
        try {
            return ResponseEntity.ok(service.update(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
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
}
