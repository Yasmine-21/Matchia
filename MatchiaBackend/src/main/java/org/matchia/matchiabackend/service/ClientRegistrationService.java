package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.ClientRegistrationVerification;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.ClientRegistrationVerificationRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ClientRegistrationService {

    static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final BankRepository bankRepository;
    private final UserRepository userRepository;
    private final ClientRegistrationVerificationRepository verificationRepository;
    private final PasswordService passwordService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Stores a pending registration and emails its one-time verification code. */
    @Transactional
    public ClientRegistrationVerificationResponse register(ClientRegistrationRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ClientRegistrationVerificationException(HttpStatus.BAD_REQUEST, "Les mots de passe ne correspondent pas.");
        }

        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ClientRegistrationVerificationException(HttpStatus.CONFLICT, "Un compte existe deja avec cet e-mail.");
        }

        Bank bank = bankRepository.findBySlug(request.getBankSlug().trim())
                .orElseThrow(() -> new ClientRegistrationVerificationException(HttpStatus.NOT_FOUND, "Marketplace introuvable."));

        Instant now = Instant.now();
        enforceResendCooldown(email, now);
        invalidatePendingCode(email, now);

        String code = String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
        ClientRegistrationVerification verification = new ClientRegistrationVerification();
        verification.setBank(bank);
        verification.setFullName(request.getFullName().trim());
        verification.setEmail(email);
        verification.setPhone(request.getPhone().trim());
        verification.setAddress(request.getAddress().trim());
        verification.setBirthDate(request.getBirthDate());
        verification.setContactImageUrl(request.getContactImageUrl());
        verification.setPasswordHash(passwordService.encode(request.getPassword()));
        verification.setCodeHash(passwordEncoder.encode(code));
        verification.setCreatedAt(now);
        verification.setExpiresAt(now.plus(CODE_LIFETIME));
        verificationRepository.save(verification);

        if (!emailService.sendClientRegistrationVerificationCode(email, code)) {
            verification.setInvalidatedAt(Instant.now());
            verificationRepository.save(verification);
            throw new ClientRegistrationVerificationException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le code de verification n'a pas pu etre envoye. Veuillez reessayer."
            );
        }
        return response("Un code de verification a ete envoye a votre adresse e-mail.");
    }

    /** Sends a fresh code for an existing pending registration, subject to the cooldown. */
    @Transactional
    public ClientRegistrationVerificationResponse resendCode(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ClientRegistrationVerificationException(HttpStatus.CONFLICT, "Un compte existe deja avec cet e-mail.");
        }

        Instant now = Instant.now();
        enforceResendCooldown(email, now);
        ClientRegistrationVerification pending = verificationRepository
                .findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new ClientRegistrationVerificationException(
                        HttpStatus.BAD_REQUEST,
                        "Aucune inscription en attente n'a ete trouvee pour cette adresse e-mail."
                ));
        pending.setInvalidatedAt(now);
        verificationRepository.save(pending);

        String code = String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
        ClientRegistrationVerification replacement = new ClientRegistrationVerification();
        replacement.setBank(pending.getBank());
        replacement.setFullName(pending.getFullName());
        replacement.setEmail(pending.getEmail());
        replacement.setPhone(pending.getPhone());
        replacement.setAddress(pending.getAddress());
        replacement.setBirthDate(pending.getBirthDate());
        replacement.setContactImageUrl(pending.getContactImageUrl());
        replacement.setPasswordHash(pending.getPasswordHash());
        replacement.setCodeHash(passwordEncoder.encode(code));
        replacement.setCreatedAt(now);
        replacement.setExpiresAt(now.plus(CODE_LIFETIME));
        verificationRepository.save(replacement);

        if (!emailService.sendClientRegistrationVerificationCode(email, code)) {
            replacement.setInvalidatedAt(Instant.now());
            verificationRepository.save(replacement);
            throw new ClientRegistrationVerificationException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le code de verification n'a pas pu etre envoye. Veuillez reessayer."
            );
        }
        return response("Un nouveau code de verification a ete envoye.");
    }

    /** Creates the active client account only after successful, unexpired code validation. */
    @Transactional
    public ClientProfileDto verifyCode(String rawEmail, String code) {
        String email = normalizeEmail(rawEmail);
        ClientRegistrationVerification verification = verificationRepository
                .findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(this::incorrectCode);

        Instant now = Instant.now();
        if (!verification.getExpiresAt().isAfter(now)) {
            verification.setInvalidatedAt(now);
            verificationRepository.save(verification);
            throw new ClientRegistrationVerificationException(
                    HttpStatus.GONE,
                    "Le code de verification a expire. Veuillez demander un nouveau code."
            );
        }
        if (!passwordEncoder.matches(code, verification.getCodeHash())) {
            throw incorrectCode();
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ClientRegistrationVerificationException(HttpStatus.CONFLICT, "Un compte existe deja avec cet e-mail.");
        }

        User client = new User();
        client.setBank(verification.getBank());
        client.setFullName(verification.getFullName());
        client.setEmail(verification.getEmail());
        client.setPhone(verification.getPhone());
        client.setAddress(verification.getAddress());
        client.setBirthDate(verification.getBirthDate());
        client.setContactImageUrl(verification.getContactImageUrl());
        client.setRole(RoleEnum.CLIENT);
        client.setStatus(UserStatusEnum.active);
        client.setPassword(verification.getPasswordHash());

        User saved = userRepository.save(client);
        verification.setConsumedAt(now);
        verificationRepository.save(verification);
        return FinancingRequestService.toClientProfile(saved);
    }

    private void enforceResendCooldown(String email, Instant now) {
        verificationRepository.findFirstByEmailOrderByCreatedAtDesc(email).ifPresent(latest -> {
            long elapsed = Duration.between(latest.getCreatedAt(), now).getSeconds();
            if (elapsed < RESEND_COOLDOWN.getSeconds()) {
                throw new ClientRegistrationVerificationException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Veuillez patienter avant de renvoyer un nouveau code.",
                        RESEND_COOLDOWN.getSeconds() - Math.max(elapsed, 0)
                );
            }
        });
    }

    private void invalidatePendingCode(String email, Instant now) {
        verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .ifPresent(previous -> {
                    previous.setInvalidatedAt(now);
                    verificationRepository.save(previous);
                });
    }

    private ClientRegistrationVerificationResponse response(String message) {
        return new ClientRegistrationVerificationResponse(message, CODE_LIFETIME.getSeconds(), RESEND_COOLDOWN.getSeconds());
    }

    private ClientRegistrationVerificationException incorrectCode() {
        return new ClientRegistrationVerificationException(HttpStatus.BAD_REQUEST, "Le code de verification est incorrect.");
    }

    private String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
