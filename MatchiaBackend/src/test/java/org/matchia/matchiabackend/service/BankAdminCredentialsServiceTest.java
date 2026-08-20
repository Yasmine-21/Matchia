package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankAdminCredentialsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private BankAdminCredentialsService service;

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldIssuePassword_whenRequestIsJoin() {
        Request request = new Request();
        request.setId(9L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail("admin@bank.tn");
        User admin = new User();
        admin.setEmail("admin@bank.tn");
        admin.setPassword("oldHash");

        when(userRepository.findByEmail("admin@bank.tn")).thenReturn(Optional.of(admin));
        when(passwordService.generateTemporaryPassword()).thenReturn("TempPass123!");
        when(userRepository.save(any(User.class))).thenReturn(admin);

        service.issueAfterSuccessfulMarketplacePayment(request);

        verify(passwordService).setPassword(admin, "TempPass123!");
        verify(emailService).sendBankCredentialsEmail(request, admin, "TempPass123!");
    }

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldUseBankEmail_whenContactEmailIsNull() {
        Request request = new Request();
        request.setId(10L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail(null);
        request.setBankEmail("bank@bank.tn");
        User admin = new User();
        admin.setEmail("bank@bank.tn");

        when(userRepository.findByEmail("bank@bank.tn")).thenReturn(Optional.of(admin));
        when(passwordService.generateTemporaryPassword()).thenReturn("TempPass123!");
        when(userRepository.save(any(User.class))).thenReturn(admin);

        service.issueAfterSuccessfulMarketplacePayment(request);

        verify(userRepository).findByEmail("bank@bank.tn");
        verify(emailService).sendBankCredentialsEmail(request, admin, "TempPass123!");
    }

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldReturn_whenRequestIsNull() {
        service.issueAfterSuccessfulMarketplacePayment(null);

        verifyNoInteractions(userRepository, passwordService, emailService);
    }

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldReturn_whenRequestTypeIsNotJoin() {
        Request request = new Request();
        request.setId(11L);
        request.setRequestType(RequestTypeEnum.store);

        service.issueAfterSuccessfulMarketplacePayment(request);

        verifyNoInteractions(userRepository, passwordService, emailService);
    }

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldReturn_whenBothEmailsAreNullOrBlank() {
        Request request = new Request();
        request.setId(12L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail("   ");
        request.setBankEmail(null);

        service.issueAfterSuccessfulMarketplacePayment(request);

        verifyNoInteractions(userRepository, passwordService, emailService);
    }

    @Test
    void issueAfterSuccessfulMarketplacePayment_shouldReturn_whenUserNotFound() {
        Request request = new Request();
        request.setId(13L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail("admin@bank.tn");

        when(userRepository.findByEmail("admin@bank.tn")).thenReturn(Optional.empty());

        service.issueAfterSuccessfulMarketplacePayment(request);

        verify(userRepository).findByEmail("admin@bank.tn");
        verifyNoInteractions(passwordService, emailService);
    }

    @Test
    void issuesRawPasswordOnlyToEmailAndStoresOnlyItsBcryptHash() {
        // Test integration logic by instantiating PasswordService instead of mock
        PasswordService realPasswordService = new PasswordService(new BCryptPasswordEncoder(), userRepository);
        BankAdminCredentialsService integratedService = new BankAdminCredentialsService(userRepository, realPasswordService, emailService);

        Request request = new Request();
        request.setId(9L);
        request.setRequestType(RequestTypeEnum.join);
        request.setContactEmail("admin@bank.tn");
        User admin = new User();
        admin.setEmail("admin@bank.tn");

        when(userRepository.findByEmail("admin@bank.tn")).thenReturn(Optional.of(admin));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        integratedService.issueAfterSuccessfulMarketplacePayment(request);

        ArgumentCaptor<String> rawPassword = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendBankCredentialsEmail(eq(request), eq(admin), rawPassword.capture());
        
        assertTrue(realPasswordService.isBcryptHash(admin.getPassword()));
        assertTrue(realPasswordService.matches(rawPassword.getValue(), admin.getPassword()));
        assertFalse(admin.getPassword().equals(rawPassword.getValue()));
    }
}
