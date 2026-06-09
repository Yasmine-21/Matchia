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
        dto.setEmail(bank.getEmail());
        dto.setLogoUrl(bank.getLogoUrl());
        dto.setCountry(bank.getCountry());
        dto.setDescription(bank.getDescription());
        dto.setWebsiteUrl(bank.getWebsiteUrl());
        dto.setEstablishedYear(bank.getEstablishedYear());
        dto.setEstablishmentYear(bank.getEstablishedYear());
        dto.setCreatedAt(bank.getCreatedAt());
        dto.setStatus(bank.getStatus());
        dto.setTotalUsers(bank.getTotalUsers());

        return dto;
    }
    public Bank toEntity(BankDto dto) {
        if (dto == null) return null;

        Bank bank = new Bank();
        bank.setName(dto.getName());
        bank.setSlug(dto.getSlug());
        bank.setEmail(dto.getEmail());
        bank.setLogoUrl(dto.getLogoUrl());
        bank.setCountry(dto.getCountry());
        bank.setDescription(dto.getDescription());
        bank.setWebsiteUrl(dto.getWebsiteUrl());
        bank.setEstablishedYear(dto.getEstablishmentYear() != null ? dto.getEstablishmentYear() : dto.getEstablishedYear());
        bank.setCreatedAt(dto.getCreatedAt());
        bank.setStatus(dto.getStatus());
        bank.setTotalUsers(dto.getTotalUsers());


        return bank;
    }
}
