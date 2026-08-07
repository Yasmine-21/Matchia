package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.JoinEmailVerification;
import org.matchia.matchiabackend.repository.JoinEmailVerificationRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JoinEmailVerificationServiceTest {

    @Mock
    private JoinEmailVerificationRepository verificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RequestRepository requestRepository;
    @Mock
    private EmailService emailService;

    private BCryptPasswordEncoder passwordEncoder;
    private JoinEmailVerificationService service;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);
        service = new JoinEmailVerificationService(
                verificationRepository,
                userRepository,
                requestRepository,
                passwordEncoder,
                emailService
        );
    }

    @Test
    void sendCodeStoresHashedCodeAndSendsSixDigits() {
        when(userRepository.existsByEmailIgnoreCase("admin@bank.tn")).thenReturn(false);
        when(requestRepository.existsByContactEmailIgnoreCaseAndRequestTypeAndStatusIn(anyString(), any(), any()))
                .thenReturn(false);
        when(verificationRepository.findFirstByEmailOrderByCreatedAtDesc("admin@bank.tn"))
                .thenReturn(Optional.empty());
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("admin@bank.tn"))
                .thenReturn(Optional.empty());
        when(emailService.sendJoinEmailVerificationCode(anyString(), anyString())).thenReturn(true);

        var response = service.sendCode(" Admin@Bank.tn ");

        ArgumentCaptor<JoinEmailVerification> verificationCaptor = ArgumentCaptor.forClass(JoinEmailVerification.class);
        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(verificationRepository).save(verificationCaptor.capture());
        verify(emailService).sendJoinEmailVerificationCode(anyString(), codeCaptor.capture());

        assertTrue(codeCaptor.getValue().matches("\\d{6}"));
        assertTrue(passwordEncoder.matches(codeCaptor.getValue(), verificationCaptor.getValue().getCodeHash()));
        assertFalse(verificationCaptor.getValue().getCodeHash().equals(codeCaptor.getValue()));
        assertEquals(600, response.expiresInSeconds());
        assertEquals(60, response.resendAvailableInSeconds());
    }

    @Test
    void verifyCodeRejectsIncorrectCodeWithExpectedMessage() {
        JoinEmailVerification verification = activeVerification("admin@bank.tn", "123456");
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("admin@bank.tn"))
                .thenReturn(Optional.of(verification));

        JoinEmailVerificationException exception = assertThrows(
                JoinEmailVerificationException.class,
                () -> service.verifyCode("admin@bank.tn", "654321")
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Le code de vérification est incorrect.", exception.getMessage());
    }

    @Test
    void verifyCodeRejectsExpiredCodeWithExpectedMessage() {
        JoinEmailVerification verification = activeVerification("admin@bank.tn", "123456");
        verification.setExpiresAt(Instant.now().minusSeconds(1));
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("admin@bank.tn"))
                .thenReturn(Optional.of(verification));

        JoinEmailVerificationException exception = assertThrows(
                JoinEmailVerificationException.class,
                () -> service.verifyCode("admin@bank.tn", "123456")
        );

        assertEquals(HttpStatus.GONE, exception.getStatus());
        assertEquals("Le code de vérification a expiré. Veuillez demander un nouveau code.", exception.getMessage());
        assertNotNull(verification.getInvalidatedAt());
    }

    @Test
    void verifiedTokenCanBeConsumedOnlyOnceForSameEmail() {
        JoinEmailVerification verification = activeVerification("admin@bank.tn", "123456");
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("admin@bank.tn"))
                .thenReturn(Optional.of(verification));

        var verifyResponse = service.verifyCode("admin@bank.tn", "123456");
        when(verificationRepository.findByVerificationTokenHash(verification.getVerificationTokenHash()))
                .thenReturn(Optional.of(verification));

        service.consumeForJoinRequest("admin@bank.tn", verifyResponse.verificationToken());

        assertNotNull(verification.getConsumedAt());
        JoinEmailVerificationException exception = assertThrows(
                JoinEmailVerificationException.class,
                () -> service.consumeForJoinRequest("admin@bank.tn", verifyResponse.verificationToken())
        );
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    private JoinEmailVerification activeVerification(String email, String code) {
        JoinEmailVerification verification = new JoinEmailVerification();
        verification.setEmail(email);
        verification.setCodeHash(passwordEncoder.encode(code));
        verification.setCreatedAt(Instant.now());
        verification.setExpiresAt(Instant.now().plusSeconds(600));
        return verification;
    }
}
