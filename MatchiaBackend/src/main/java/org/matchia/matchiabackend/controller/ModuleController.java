package org.matchia.matchiabackend.controller;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ModuleDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.mapper.ModuleMapper;
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
    public ResponseEntity<List<ModuleDto>> getAll() {
        return ResponseEntity.ok(moduleService.getAllModules());
    }

    @PostMapping
    public ResponseEntity<ModuleDto> create(@RequestBody ModuleDto dto) {
        return ResponseEntity.ok(moduleService.createModule(dto));
    }
}