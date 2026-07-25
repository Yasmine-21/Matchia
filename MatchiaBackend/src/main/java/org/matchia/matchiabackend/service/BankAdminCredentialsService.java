package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankAdminCredentialsService {

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final EmailService emailService;

    /** Issues credentials after the first successful payment of a marketplace request. */
    public void issueAfterSuccessfulMarketplacePayment(Request request) {
        if (request == null || request.getRequestType() != RequestTypeEnum.join) {
            return;
        }

        String email = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
        if (!hasText(email)) {
            log.warn("Impossible d'envoyer les identifiants: email administrateur absent pour la demande {}.", request.getId());
            return;
        }

        User adminUser = userRepository.findByEmail(email).orElse(null);
        if (adminUser == null) {
            log.warn("Impossible d'envoyer les identifiants: administrateur introuvable pour la demande {}.", request.getId());
            return;
        }

        String temporaryPassword = passwordService.generateTemporaryPassword();
        passwordService.setPassword(adminUser, temporaryPassword);
        User savedAdmin = userRepository.save(adminUser);
        emailService.sendBankCredentialsEmail(request, savedAdmin, temporaryPassword);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
