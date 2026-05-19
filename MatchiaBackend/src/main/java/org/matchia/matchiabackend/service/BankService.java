package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.mapper.BankMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BankService {

    private final BankRepository bankRepository;
    private final BankMapper bankMapper;

    public BankService(BankRepository bankRepository, BankMapper bankMapper) {
        this.bankRepository = bankRepository;
        this.bankMapper = bankMapper;
    }

    public List<BankDto> getAllBanks() {
        return bankRepository.findAll()
                .stream()
                .map(bankMapper::toDto)
                .collect(Collectors.toList());
    }
    public BankDto createBank(BankDto bankDto) {
        Bank bank = bankMapper.toEntity(bankDto);

        Bank savedBank = bankRepository.save(bank);
        return bankMapper.toDto(savedBank);
    }

    public BankDto updateBank(Long id, BankDto bankDto) {

        Bank existingBank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvée avec l'id : " + id));

        existingBank.setName(bankDto.getName());
        existingBank.setSlug(bankDto.getSlug());
        existingBank.setDescription(bankDto.getDescription());
        existingBank.setCountry(bankDto.getCountry());
        existingBank.setLogoUrl(bankDto.getLogoUrl());
        existingBank.setEstablishedYear(bankDto.getEstablishedYear());
        existingBank.setStatus(bankDto.getStatus()); 


        Bank updatedBank = bankRepository.save(existingBank);
        return bankMapper.toDto(updatedBank);
    }


    public void deleteBank(Long id) {
        if (!bankRepository.existsById(id)) {
            throw new RuntimeException("Impossible de supprimer : banque introuvable");
        }
        bankRepository.deleteById(id);
    }
}