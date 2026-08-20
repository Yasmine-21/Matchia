package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DealerSecurityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private DealerSecurityService dealerSecurityService;

    @Test
    void currentUser_shouldReturnUser_whenAuthenticatedAndUserExists() {
        User expectedUser = new User();
        expectedUser.setEmail("test@test.com");
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("test@test.com");
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(expectedUser));

        User result = dealerSecurityService.currentUser(authentication);

        assertEquals(expectedUser, result);
    }

    @Test
    void currentUser_shouldThrowUnauthorized_whenAuthenticationIsNull() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.currentUser(null));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        assertEquals("Authentification requise.", ex.getReason());
    }

    @Test
    void currentUser_shouldThrowUnauthorized_whenNotAuthenticated() {
        when(authentication.isAuthenticated()).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.currentUser(authentication));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        assertEquals("Authentification requise.", ex.getReason());
    }

    @Test
    void currentUser_shouldThrowUnauthorized_whenUserNotFound() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("unknown@test.com");
        when(userRepository.findByEmailIgnoreCase("unknown@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.currentUser(authentication));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        assertEquals("Utilisateur introuvable.", ex.getReason());
    }

    @Test
    void requireSaas_shouldReturnUser_whenRoleIsAdminSaas() {
        User expectedUser = new User();
        expectedUser.setEmail("saas@test.com");
        expectedUser.setRole(RoleEnum.ADMIN_SAAS);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("saas@test.com");
        when(userRepository.findByEmailIgnoreCase("saas@test.com")).thenReturn(Optional.of(expectedUser));

        User result = dealerSecurityService.requireSaas(authentication);

        assertEquals(expectedUser, result);
    }

    @Test
    void requireSaas_shouldThrowForbidden_whenRoleIsNotAdminSaas() {
        User user = new User();
        user.setEmail("user@test.com");
        user.setRole(RoleEnum.ADMIN_BANK);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("user@test.com");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireSaas(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve a l'administration SaaS.", ex.getReason());
    }

    @Test
    void requireDealer_shouldReturnUser_whenRoleIsDealerAdminAndDealerIsActive() {
        Dealer dealer = new Dealer();
        dealer.setStatus(DealerStatusEnum.ACTIVE);
        
        User expectedUser = new User();
        expectedUser.setEmail("dealer@test.com");
        expectedUser.setRole(RoleEnum.DEALER_ADMIN);
        expectedUser.setDealer(dealer);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("dealer@test.com");
        when(userRepository.findByEmailIgnoreCase("dealer@test.com")).thenReturn(Optional.of(expectedUser));

        User result = dealerSecurityService.requireDealer(authentication);

        assertEquals(expectedUser, result);
    }

    @Test
    void requireDealer_shouldThrowForbidden_whenRoleIsNotDealerAdmin() {
        User user = new User();
        user.setEmail("user@test.com");
        user.setRole(RoleEnum.ADMIN_BANK);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("user@test.com");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireDealer(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve aux concessionnaires.", ex.getReason());
    }

    @Test
    void requireDealer_shouldThrowForbidden_whenDealerIsNull() {
        User user = new User();
        user.setEmail("dealer@test.com");
        user.setRole(RoleEnum.DEALER_ADMIN);
        user.setDealer(null); // Dealer is null
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("dealer@test.com");
        when(userRepository.findByEmailIgnoreCase("dealer@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireDealer(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve aux concessionnaires.", ex.getReason());
    }
    
    @Test
    void requireDealer_shouldThrowForbidden_whenDealerIsNotActive() {
        Dealer dealer = new Dealer();
        dealer.setStatus(DealerStatusEnum.PENDING); // Not active
        
        User user = new User();
        user.setEmail("dealer@test.com");
        user.setRole(RoleEnum.DEALER_ADMIN);
        user.setDealer(dealer);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("dealer@test.com");
        when(userRepository.findByEmailIgnoreCase("dealer@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireDealer(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve aux concessionnaires.", ex.getReason());
    }

    @Test
    void requireBank_shouldReturnUser_whenRoleIsAdminSaas() {
        User expectedUser = new User();
        expectedUser.setEmail("saas@test.com");
        expectedUser.setRole(RoleEnum.ADMIN_SAAS);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("saas@test.com");
        when(userRepository.findByEmailIgnoreCase("saas@test.com")).thenReturn(Optional.of(expectedUser));

        User result = dealerSecurityService.requireBank(authentication);

        assertEquals(expectedUser, result);
    }

    @Test
    void requireBank_shouldReturnUser_whenRoleIsAdminBankAndBankIsNotNull() {
        Bank bank = new Bank();
        
        User expectedUser = new User();
        expectedUser.setEmail("bank@test.com");
        expectedUser.setRole(RoleEnum.ADMIN_BANK);
        expectedUser.setBank(bank);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("bank@test.com");
        when(userRepository.findByEmailIgnoreCase("bank@test.com")).thenReturn(Optional.of(expectedUser));

        User result = dealerSecurityService.requireBank(authentication);

        assertEquals(expectedUser, result);
    }

    @Test
    void requireBank_shouldThrowForbidden_whenRoleIsNotAdminBankOrAdminSaas() {
        User user = new User();
        user.setEmail("user@test.com");
        user.setRole(RoleEnum.DEALER_ADMIN);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("user@test.com");
        when(userRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireBank(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve a la banque.", ex.getReason());
    }

    @Test
    void requireBank_shouldThrowForbidden_whenRoleIsAdminBankButBankIsNull() {
        User user = new User();
        user.setEmail("bank@test.com");
        user.setRole(RoleEnum.ADMIN_BANK);
        user.setBank(null);
        
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("bank@test.com");
        when(userRepository.findByEmailIgnoreCase("bank@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
            () -> dealerSecurityService.requireBank(authentication));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Acces reserve a la banque.", ex.getReason());
    }
}
