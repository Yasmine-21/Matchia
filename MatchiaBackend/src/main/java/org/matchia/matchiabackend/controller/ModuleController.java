package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.service.ModuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/modules")
@RequiredArgsConstructor
public class ModuleController {
    private final ModuleService moduleService;

    @GetMapping
    public ResponseEntity<List<ModuleDto>> getAll(
            @RequestParam(value = "status", required = false) ModuleStatusEnum status
    ) {
        return ResponseEntity.ok(moduleService.getAllModules(status));
    }

    @PostMapping
    public ResponseEntity<ModuleDto> create(@RequestBody ModuleDto dto) {
        return ResponseEntity.ok(moduleService.createModule(dto));
    }
    @PutMapping("/{id}")
    public ResponseEntity<ModuleDto> updateModule(@PathVariable Long id, @RequestBody ModuleDto moduleDto) {
        return ResponseEntity.ok(moduleService.updateModule(id, moduleDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable Long id) {
        moduleService.deleteModule(id);
        return ResponseEntity.noContent().build();
    }
}
