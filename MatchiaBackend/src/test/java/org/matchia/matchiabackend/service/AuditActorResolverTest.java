package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditActorResolverTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuditActorResolver resolver;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolve_shouldReturnNull_whenAuditIsNull() {
        assertNull(resolver.resolve(null));
    }

    @Test
    void resolve_shouldApplySystemActor_whenSourceIsSystem() {
        AuditLogRequest request = new AuditLogRequest();
        request.setSource("AUTOMATION");

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("SYSTEM", result.getActorId());
        assertEquals("system@matchia.internal", result.getActorEmail());
        assertEquals("System", result.getActorName());
        assertEquals("SYSTEM", result.getActorRole());
        assertEquals("AUTOMATION", result.getSource());
    }

    @Test
    void resolve_shouldApplyAuthenticatedActor_whenAuthenticatedAndUserExists() {
        AuditLogRequest request = new AuditLogRequest();
        
        User user = new User();
        user.setId(10L);
        user.setEmail("admin@bank.tn");
        user.setFullName("Bank Admin");
        user.setRole(RoleEnum.ADMIN_BANK);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin@bank.tn");
        when(userRepository.findByEmail("admin@bank.tn")).thenReturn(Optional.of(user));

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("10", result.getActorId());
        assertEquals("admin@bank.tn", result.getActorEmail());
        assertEquals("Bank Admin", result.getActorName());
        assertEquals("BANK_ADMIN", result.getActorRole()); // Normalizes ADMIN_BANK
        assertEquals("BANK_BACK_OFFICE", result.getSource());
    }
    
    @Test
    void resolve_shouldApplyAuthenticatedActor_whenRoleIsAdminSaas() {
        AuditLogRequest request = new AuditLogRequest();
        
        User user = new User();
        user.setId(20L);
        user.setEmail("admin@saas.tn");
        user.setFullName("Saas Admin");
        user.setRole(RoleEnum.ADMIN_SAAS);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin@saas.tn");
        when(userRepository.findByEmail("admin@saas.tn")).thenReturn(Optional.of(user));

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("ADMIN_SAAS", result.getActorRole());
        assertEquals("SAAS_BACK_OFFICE", result.getSource());
    }

    @Test
    void resolve_shouldApplyAuthenticatedActor_whenAuthenticatedButUserNotFound() {
        AuditLogRequest request = new AuditLogRequest();
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("unknown@test.com");
        
        GrantedAuthority authority = mock(GrantedAuthority.class);
        when(authority.getAuthority()).thenReturn("ROLE_DEALER_ADMIN");
        doReturn(List.of(authority)).when(authentication).getAuthorities();
        
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("unknown@test.com", result.getActorId());
        assertEquals("unknown@test.com", result.getActorEmail());
        assertEquals("unknown@test.com", result.getActorName());
        assertEquals("DEALER_ADMIN", result.getActorRole());
        assertEquals("BANK_BACK_OFFICE", result.getSource());
    }

    @Test
    void resolve_shouldApplyAnonymous_whenNotAuthenticatedAndNoActorName() {
        AuditLogRequest request = new AuditLogRequest();

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("Anonymous", result.getActorName());
        assertEquals("ANONYMOUS", result.getActorRole());
        assertEquals("PUBLIC_API", result.getSource());
    }
    
    @Test
    void resolve_shouldApplyAnonymous_whenAuthenticationIsNull() {
        AuditLogRequest request = new AuditLogRequest();
        request.setSource("CUSTOM_SOURCE");

        when(securityContext.getAuthentication()).thenReturn(null);

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("Anonymous", result.getActorName());
        assertEquals("ANONYMOUS", result.getActorRole());
        assertEquals("CUSTOM_SOURCE", result.getSource());
    }

    @Test
    void resolve_shouldRetainActor_whenNotAuthenticatedButActorNameExists() {
        AuditLogRequest request = new AuditLogRequest();
        request.setActorName("Existing Actor");
        request.setSource(null);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        AuditLogRequest result = resolver.resolve(request);

        assertEquals("Existing Actor", result.getActorName());
        assertEquals("AUTHENTICATION", result.getSource());
    }

    @Test
    void systemEvent_shouldApplySystemActorAndSetSource() {
        AuditLogRequest request = new AuditLogRequest();

        AuditLogRequest result = resolver.systemEvent(request, "MY_CUSTOM_EVENT");

        assertEquals("SYSTEM", result.getActorId());
        assertEquals("system@matchia.internal", result.getActorEmail());
        assertEquals("System", result.getActorName());
        assertEquals("SYSTEM", result.getActorRole());
        assertEquals("MY_CUSTOM_EVENT", result.getSource());
    }
}
