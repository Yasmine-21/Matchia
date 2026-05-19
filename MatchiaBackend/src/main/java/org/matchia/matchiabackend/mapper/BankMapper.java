package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.Bank;
import org.springframework.stereotype.Component;

@Component
public class BankMapper {

    public BankDto toDto(Bank bank) {
        if (bank == null) return null;

        BankDto dto = new BankDto();
        dto.setId(bank.getId());
        dto.setName(bank.getName());
        dto.setSlug(bank.getSlug());
        dto.setLogoUrl(bank.getLogoUrl());
        dto.setCountry(bank.getCountry());
        dto.setDescription(bank.getDescription());
        dto.setEstablishedYear(bank.getEstablishedYear());
        dto.setCreatedAt(bank.getCreatedAt());
        dto.setStatus(bank.getStatus());

        return dto;
    }
    public Bank toEntity(BankDto dto) {
        if (dto == null) return null;

        Bank bank = new Bank();
        bank.setName(dto.getName());
        bank.setSlug(dto.getSlug());
        bank.setLogoUrl(dto.getLogoUrl());
        bank.setCountry(dto.getCountry());
        bank.setDescription(dto.getDescription());
        bank.setEstablishedYear(dto.getEstablishedYear());
        bank.setCreatedAt(dto.getCreatedAt());
        bank.setStatus(dto.getStatus());


        return bank;
    }
}