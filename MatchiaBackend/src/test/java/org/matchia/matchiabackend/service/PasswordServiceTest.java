package org.matchia.matchiabackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.mapper.UserMapper;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordServiceTest {

    @Test
    void generatedAndManualPasswordsAreBcryptHashedAndVerified() {
        UserRepository repository = mock(UserRepository.class);
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), repository);
        String temporaryPassword = service.generateTemporaryPassword();

        String generatedHash = service.encode(temporaryPassword);
        String manualHash = service.encode("ManualPass#2026");

        assertTrue(service.isBcryptHash(generatedHash));
        assertTrue(service.matches(temporaryPassword, generatedHash));
        assertTrue(service.matches("ManualPass#2026", manualHash));
        assertFalse(service.matches("incorrect", manualHash));
    }

    @Test
    void rejectsEmptyWeakAndAlreadyHashedPasswords() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        String hash = service.encode("ValidPass#2026");

        assertThrows(IllegalArgumentException.class, () -> service.encode(""));
        assertThrows(IllegalArgumentException.class, () -> service.encode("short"));
        assertThrows(IllegalArgumentException.class, () -> service.encode(hash));
    }

    @Test
    void validateRawPassword_throwsException_whenNull() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.validateRawPassword(null));
        assertTrue(ex.getMessage().contains("obligatoire"));
    }

    @Test
    void validateRawPassword_throwsException_whenBlank() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.validateRawPassword("   "));
        assertTrue(ex.getMessage().contains("obligatoire"));
    }

    @Test
    void validateRawPassword_throwsException_whenTooShort() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.validateRawPassword("1234567"));
        assertTrue(ex.getMessage().contains("8 caracteres"));
    }

    @Test
    void setPassword_throwsException_whenUserIsNull() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        assertThrows(IllegalArgumentException.class, () -> service.setPassword(null, "ValidPass#2026"));
    }

    @Test
    void setPassword_updatesUserPasswordWithHash() {
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), mock(UserRepository.class));
        User user = new User();
        service.setPassword(user, "ValidPass#2026");
        assertTrue(service.isBcryptHash(user.getPassword()));
    }

    @Test
    void migratesLegacyClearTextPasswordsOnce() {
        UserRepository repository = mock(UserRepository.class);
        User legacyUser = new User();
        legacyUser.setPassword("LegacyPass#2026");
        PasswordService service = new PasswordService(new BCryptPasswordEncoder(), repository);
        when(repository.findAll()).thenReturn(List.of(legacyUser));

        service.run(new DefaultApplicationArguments());

        assertTrue(service.isBcryptHash(legacyUser.getPassword()));
        assertTrue(service.matches("LegacyPass#2026", legacyUser.getPassword()));
        verify(repository).saveAll(anyList());
    }

    @Test
    void userResponsesNeverSerializePasswordsOrHashes() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setEmail("admin@example.com");
        user.setPassword("$2a$10$abcdefghijklmnopqrstuvwxyzABCDE12345678901234567890");

        String json = new ObjectMapper().writeValueAsString(new UserMapper().toDto(user));

        assertFalse(json.contains("password"));
        assertFalse(json.contains(user.getPassword()));
    }
}
