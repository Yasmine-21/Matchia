package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.JoinEmailVerificationSendResponse;
import org.matchia.matchiabackend.dto.JoinEmailVerificationVerifyResponse;
import org.matchia.matchiabackend.entity.JoinEmailVerification;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.JoinEmailVerificationRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class JoinEmailVerificationService {

    static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final Duration SUBMISSION_TOKEN_LIFETIME = Duration.ofHours(1);

    private final JoinEmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final RequestRepository requestRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public JoinEmailVerificationSendResponse sendCode(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        ensureEmailIsAvailable(email);

        Instant now = Instant.now();
        verificationRepository.findFirstByEmailOrderByCreatedAtDesc(email).ifPresent(latest -> {
            long elapsed = Duration.between(latest.getCreatedAt(), now).getSeconds();
            if (elapsed < RESEND_COOLDOWN.getSeconds()) {
                long remaining = RESEND_COOLDOWN.getSeconds() - Math.max(elapsed, 0);
                throw new JoinEmailVerificationException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Veuillez patienter avant de renvoyer un nouveau code.",
                        remaining
                );
            }
        });

        verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .ifPresent(previous -> {
                    previous.setInvalidatedAt(now);
                    verificationRepository.save(previous);
                });

        String code = String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
        JoinEmailVerification verification = new JoinEmailVerification();
        verification.setEmail(email);
        verification.setCodeHash(passwordEncoder.encode(code));
        verification.setCreatedAt(now);
        verification.setExpiresAt(now.plus(CODE_LIFETIME));
        verificationRepository.save(verification);

        if (!emailService.sendJoinEmailVerificationCode(email, code)) {
            verification.setInvalidatedAt(Instant.now());
            verificationRepository.save(verification);
            throw new JoinEmailVerificationException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le code de vérification n'a pas pu être envoyé. Veuillez réessayer."
            );
        }

        return new JoinEmailVerificationSendResponse(
                "Un code de vérification a été envoyé à votre adresse e-mail.",
                CODE_LIFETIME.getSeconds(),
                RESEND_COOLDOWN.getSeconds()
        );
    }

    @Transactional
    public JoinEmailVerificationVerifyResponse verifyCode(String rawEmail, String code) {
        String email = normalizeEmail(rawEmail);
        JoinEmailVerification verification = verificationRepository
                .findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(this::incorrectCode);

        Instant now = Instant.now();
        if (verification.getExpiresAt().isBefore(now)) {
            verification.setInvalidatedAt(now);
            verificationRepository.save(verification);
            throw new JoinEmailVerificationException(
                    HttpStatus.GONE,
                    "Le code de vérification a expiré. Veuillez demander un nouveau code."
            );
        }
        if (verification.getVerifiedAt() != null || !passwordEncoder.matches(code, verification.getCodeHash())) {
            throw incorrectCode();
        }

        String rawToken = generateSubmissionToken();
        verification.setVerifiedAt(now);
        verification.setVerificationTokenHash(hashToken(rawToken));
        verification.setVerificationTokenExpiresAt(now.plus(SUBMISSION_TOKEN_LIFETIME));
        verificationRepository.save(verification);

        return new JoinEmailVerificationVerifyResponse(
                true,
                rawToken,
                "Adresse e-mail vérifiée avec succès."
        );
    }

    @Transactional
    public void consumeForJoinRequest(String rawEmail, String rawVerificationToken) {
        if (rawVerificationToken == null || rawVerificationToken.isBlank()) {
            throw verificationRequired();
        }

        String email = normalizeEmail(rawEmail);
        JoinEmailVerification verification = verificationRepository
                .findByVerificationTokenHash(hashToken(rawVerificationToken))
                .orElseThrow(this::verificationRequired);
        Instant now = Instant.now();

        boolean invalid = !verification.getEmail().equals(email)
                || verification.getVerifiedAt() == null
                || verification.getInvalidatedAt() != null
                || verification.getConsumedAt() != null
                || verification.getVerificationTokenExpiresAt() == null
                || verification.getVerificationTokenExpiresAt().isBefore(now);
        if (invalid) {
            throw verificationRequired();
        }

        verification.setConsumedAt(now);
        verificationRepository.save(verification);
    }

    private void ensureEmailIsAvailable(String email) {
        boolean alreadyUsed = userRepository.existsByEmailIgnoreCase(email)
                || requestRepository.existsByContactEmailIgnoreCaseAndRequestTypeAndStatusIn(
                        email,
                        RequestTypeEnum.join,
                        List.of(RequestStatusEnum.pending, RequestStatusEnum.approved)
                );
        if (alreadyUsed) {
            throw new JoinEmailVerificationException(
                    HttpStatus.CONFLICT,
                "Cette adresse e-mail est déjà utilisée."
            );
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateSubmissionToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponible.", exception);
        }
    }

    private JoinEmailVerificationException incorrectCode() {
        return new JoinEmailVerificationException(
                HttpStatus.BAD_REQUEST,
                "Le code de vérification est incorrect."
        );
    }

    private JoinEmailVerificationException verificationRequired() {
        return new JoinEmailVerificationException(
                HttpStatus.BAD_REQUEST,
                "L'adresse e-mail du contact doit être vérifiée avant l'envoi de la demande."
        );
    }
}
