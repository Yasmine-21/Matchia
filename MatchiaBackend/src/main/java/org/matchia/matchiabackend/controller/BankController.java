package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.mapper.BankMapper;
import org.matchia.matchiabackend.service.BankService;

import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/banks")
@CrossOrigin(origins = "*")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {

        this.bankService = bankService;
    }

    @GetMapping
    public List<BankDto> getBanks() {

        return bankService.getAllBanks();
    }
    @PostMapping
    public BankDto createBank(@RequestBody BankDto bankDto) {

        return bankService.createBank(bankDto);
    }

    @PutMapping("/{id}")
    public BankDto updateBank(@PathVariable Long id, @RequestBody BankDto bankDto) {
        return bankService.updateBank(id, bankDto);
    }

    @DeleteMapping("/{id}")
    public void deleteBank(@PathVariable Long id) {
        bankService.deleteBank(id);
    }
}