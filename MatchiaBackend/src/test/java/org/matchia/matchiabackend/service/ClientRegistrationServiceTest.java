package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationResponse;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.ClientRegistrationVerification;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.ClientRegistrationVerificationRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientRegistrationServiceTest {

    @Mock private BankRepository bankRepository;
    @Mock private UserRepository userRepository;
    @Mock private ClientRegistrationVerificationRepository verificationRepository;
    @Mock private PasswordService passwordService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;

    @InjectMocks private ClientRegistrationService clientRegistrationService;

    @Test
    void registerStoresPendingRegistrationAndSendsCodeWithoutCreatingUser() {
        ClientRegistrationRequest request = validRequest();
        Bank bank = new Bank();
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(bankRepository.findBySlug("bank-slug")).thenReturn(Optional.of(bank));
        when(verificationRepository.findFirstByEmailOrderByCreatedAtDesc("test@test.com")).thenReturn(Optional.empty());
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("test@test.com"))
                .thenReturn(Optional.empty());
        when(passwordService.encode("password123")).thenReturn("password-hash");
        when(passwordEncoder.encode(any())).thenReturn("code-hash");
        when(emailService.sendClientRegistrationVerificationCode(any(), any())).thenReturn(true);

        ClientRegistrationVerificationResponse response = clientRegistrationService.register(request);

        ArgumentCaptor<ClientRegistrationVerification> captor = ArgumentCaptor.forClass(ClientRegistrationVerification.class);
        verify(verificationRepository).save(captor.capture());
        ClientRegistrationVerification pending = captor.getValue();
        assertThat(pending.getBank()).isSameAs(bank);
        assertThat(pending.getEmail()).isEqualTo("test@test.com");
        assertThat(pending.getPasswordHash()).isEqualTo("password-hash");
        assertThat(pending.getExpiresAt()).isAfter(pending.getCreatedAt());
        assertThat(response.expiresInSeconds()).isEqualTo(600);
        verify(emailService).sendClientRegistrationVerificationCode(eq("test@test.com"), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerRejectsMismatchingPasswords() {
        ClientRegistrationRequest request = validRequest();
        request.setConfirmPassword("different");

        assertThatThrownBy(() -> clientRegistrationService.register(request))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .hasMessage("Les mots de passe ne correspondent pas.");

        verify(verificationRepository, never()).save(any());
    }

    @Test
    void registerRejectsEmailAlreadyOwnedByAClient() {
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(true);

        assertThatThrownBy(() -> clientRegistrationService.register(validRequest()))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .hasMessageContaining("compte existe");

        verify(bankRepository, never()).findBySlug(any());
    }

    @Test
    void registerAppliesResendCooldown() {
        ClientRegistrationVerification latest = new ClientRegistrationVerification();
        latest.setCreatedAt(Instant.now());
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(bankRepository.findBySlug("bank-slug")).thenReturn(Optional.of(new Bank()));
        when(verificationRepository.findFirstByEmailOrderByCreatedAtDesc("test@test.com")).thenReturn(Optional.of(latest));

        assertThatThrownBy(() -> clientRegistrationService.register(validRequest()))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .satisfies(error -> assertThat(((ClientRegistrationVerificationException) error).getStatus())
                        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void registerInvalidatesCodeWhenEmailDeliveryFails() {
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(bankRepository.findBySlug("bank-slug")).thenReturn(Optional.of(new Bank()));
        when(verificationRepository.findFirstByEmailOrderByCreatedAtDesc("test@test.com")).thenReturn(Optional.empty());
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("test@test.com"))
                .thenReturn(Optional.empty());
        when(passwordService.encode(any())).thenReturn("password-hash");
        when(passwordEncoder.encode(any())).thenReturn("code-hash");
        when(emailService.sendClientRegistrationVerificationCode(any(), any())).thenReturn(false);

        assertThatThrownBy(() -> clientRegistrationService.register(validRequest()))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .hasMessageContaining("n'a pas pu etre envoye");

        verify(verificationRepository, times(2)).save(any(ClientRegistrationVerification.class));
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyCodeCreatesActiveClientAndConsumesCode() {
        ClientRegistrationVerification pending = pendingVerification();
        User savedUser = new User();
        savedUser.setFullName("John Doe");
        savedUser.setEmail("test@test.com");
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("test@test.com"))
                .thenReturn(Optional.of(pending));
        when(passwordEncoder.matches("123456", "code-hash")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        ClientProfileDto profile = clientRegistrationService.verifyCode("TEST@test.com", "123456");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User client = userCaptor.getValue();
        assertThat(client.getStatus()).isEqualTo(UserStatusEnum.active);
        assertThat(client.getPassword()).isEqualTo("password-hash");
        assertThat(client.getBank()).isSameAs(pending.getBank());
        assertThat(profile.getEmail()).isEqualTo("test@test.com");
        assertThat(pending.getConsumedAt()).isNotNull();
        verify(verificationRepository).save(pending);
    }

    @Test
    void verifyCodeRejectsExpiredCodeAndNeverCreatesClient() {
        ClientRegistrationVerification pending = pendingVerification();
        pending.setExpiresAt(Instant.now().minusSeconds(1));
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("test@test.com"))
                .thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> clientRegistrationService.verifyCode("test@test.com", "123456"))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .satisfies(error -> assertThat(((ClientRegistrationVerificationException) error).getStatus()).isEqualTo(HttpStatus.GONE));

        assertThat(pending.getInvalidatedAt()).isNotNull();
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyCodeRejectsIncorrectCodeAndNeverCreatesClient() {
        ClientRegistrationVerification pending = pendingVerification();
        when(verificationRepository.findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc("test@test.com"))
                .thenReturn(Optional.of(pending));
        when(passwordEncoder.matches("000000", "code-hash")).thenReturn(false);

        assertThatThrownBy(() -> clientRegistrationService.verifyCode("test@test.com", "000000"))
                .isInstanceOf(ClientRegistrationVerificationException.class)
                .hasMessageContaining("incorrect");

        verify(userRepository, never()).save(any());
    }

    private ClientRegistrationRequest validRequest() {
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setEmail("test@test.com");
        request.setBankSlug("bank-slug");
        request.setFullName("John Doe");
        request.setPhone("123456789");
        request.setAddress("Address");
        request.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
        return request;
    }

    private ClientRegistrationVerification pendingVerification() {
        ClientRegistrationVerification pending = new ClientRegistrationVerification();
        pending.setBank(new Bank());
        pending.setFullName("John Doe");
        pending.setEmail("test@test.com");
        pending.setPhone("123456789");
        pending.setAddress("Address");
        pending.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
        pending.setPasswordHash("password-hash");
        pending.setCodeHash("code-hash");
        pending.setCreatedAt(Instant.now().minusSeconds(30));
        pending.setExpiresAt(Instant.now().plusSeconds(300));
        return pending;
    }
}
