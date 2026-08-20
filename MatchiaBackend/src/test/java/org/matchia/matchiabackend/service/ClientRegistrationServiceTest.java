package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientRegistrationServiceTest {

    @Mock
    private BankRepository bankRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordService passwordService;

    @InjectMocks
    private ClientRegistrationService clientRegistrationService;

    @Test
    void register_success() {
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        request.setPassword("password");
        request.setConfirmPassword("password");
        request.setEmail("test@test.com");
        request.setBankSlug("bank-slug");
        request.setFullName("John Doe");
        request.setPhone("123456789");
        request.setAddress("Address");

        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(bankRepository.findBySlug("bank-slug")).thenReturn(Optional.of(new Bank()));
        
        User savedUser = new User();
        savedUser.setFullName("John Doe");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        ClientProfileDto result = clientRegistrationService.register(request);

        assertThat(result).isNotNull();
        assertThat(result.getFullName()).isEqualTo("John Doe");
        verify(passwordService).setPassword(any(User.class), eq("password"));
    }

    @Test
    void register_passwordsDoNotMatch_throwsException() {
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        request.setPassword("password");
        request.setConfirmPassword("different");

        assertThatThrownBy(() -> clientRegistrationService.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Les mots de passe ne correspondent pas");
    }

    @Test
    void register_emailAlreadyExists_throwsException() {
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        request.setPassword("password");
        request.setConfirmPassword("password");
        request.setEmail("test@test.com");

        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(true);

        assertThatThrownBy(() -> clientRegistrationService.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Un compte existe");
    }
}
