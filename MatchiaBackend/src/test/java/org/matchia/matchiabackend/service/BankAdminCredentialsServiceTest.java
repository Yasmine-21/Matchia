package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BankAdminCredentialsServiceTest {

    @Test
    void issuesRawPasswordOnlyToEmailAndStoresOnlyItsBcryptHash() {
        UserRepository userRepository = mock(UserRepository.class);
        EmailService emailService = mock(EmailService.class);
        PasswordService passwordService = new PasswordService(new BCryptPasswordEncoder(), userRepository);
        BankAdminCredentialsService service = new BankAdminCredentialsService(userRepository, passwordService, emailService);
        Request request = new Request();
        request.setId(9L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail("admin@bank.tn");
        User admin = new User();
        admin.setEmail("admin@bank.tn");

        when(userRepository.findByEmail("admin@bank.tn")).thenReturn(Optional.of(admin));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.issueAfterSuccessfulMarketplacePayment(request);

        ArgumentCaptor<String> rawPassword = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(1)).sendBankCredentialsEmail(any(Request.class), any(User.class), rawPassword.capture());
        assertTrue(passwordService.isBcryptHash(admin.getPassword()));
        assertTrue(passwordService.matches(rawPassword.getValue(), admin.getPassword()));
        assertFalse(admin.getPassword().equals(rawPassword.getValue()));
    }
}
