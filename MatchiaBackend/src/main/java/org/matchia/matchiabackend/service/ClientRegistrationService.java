package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ClientRegistrationService {
    private final BankRepository bankRepository;
    private final UserRepository userRepository;
    private final PasswordService passwordService;

    @Transactional
    public ClientProfileDto register(ClientRegistrationRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Les mots de passe ne correspondent pas.");
        }
        if (userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet e-mail.");
        }
        Bank bank = bankRepository.findBySlug(request.getBankSlug().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marketplace introuvable."));
        User client = new User();
        client.setBank(bank);
        client.setFullName(request.getFullName().trim());
        client.setEmail(request.getEmail().trim().toLowerCase());
        client.setPhone(request.getPhone().trim());
        client.setAddress(request.getAddress().trim());
        client.setBirthDate(request.getBirthDate());
        client.setContactImageUrl(request.getContactImageUrl());
        client.setRole(RoleEnum.CLIENT);
        client.setStatus(UserStatusEnum.active);
        passwordService.setPassword(client, request.getPassword());
        return FinancingRequestService.toClientProfile(userRepository.save(client));
    }
}
