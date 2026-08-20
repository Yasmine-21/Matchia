package org.matchia.matchiabackend.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuthRequest;
import org.matchia.matchiabackend.dto.AuthResponse;
import org.matchia.matchiabackend.dto.ForgotPasswordRequest;
import org.matchia.matchiabackend.dto.ResetPasswordRequest;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.PasswordResetToken;
import org.matchia.matchiabackend.entity.RefreshToken;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.PasswordResetTokenRepository;
import org.matchia.matchiabackend.repository.RefreshTokenRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.matchia.matchiabackend.security.JwtUtil;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private PasswordService passwordService;
    @Mock
    private EmailService emailService;
    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private HttpServletRequest httpRequest;
    @Mock
    private HttpServletResponse httpResponse;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshCookieName", "matchia_refresh_token");
        ReflectionTestUtils.setField(authService, "refreshCookieSecure", false);
        ReflectionTestUtils.setField(authService, "refreshCookieSameSite", "Lax");
        ReflectionTestUtils.setField(authService, "refreshCookieDomain", "");
        ReflectionTestUtils.setField(authService, "passwordResetTokenValidityMs", 3600000L);
        ReflectionTestUtils.setField(authService, "frontendUrl", "http://localhost:5173");
    }

    private User buildValidUser() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@test.com");
        user.setPassword("hashedPass");
        user.setStatus(UserStatusEnum.active);
        user.setRole(RoleEnum.ADMIN_SAAS);
        
        Bank bank = new Bank();
        bank.setId(2L);
        bank.setSlug("test-bank");
        user.setBank(bank);
        
        Dealer dealer = new Dealer();
        dealer.setId(3L);
        user.setDealer(dealer);
        
        return user;
    }

    @Test
    void login_success() {
        AuthRequest request = new AuthRequest();
        request.setIdentifier("test@test.com");
        request.setPassword("password");

        User user = buildValidUser();
        
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));
        when(passwordService.matches("password", "hashedPass")).thenReturn(true);
        when(jwtUtil.generateAccessToken(user, "SAAS_ADMIN", "test-bank")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(user, "SAAS_ADMIN", "test-bank")).thenReturn("refresh-token");
        when(jwtUtil.getRefreshTokenLifetime()).thenReturn(Duration.ofDays(7));

        AuthResponse response = authService.login(request, httpRequest, httpResponse);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRole()).isEqualTo("SAAS_ADMIN");
        assertThat(response.getBankSlug()).isEqualTo("test-bank");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(httpResponse).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    void login_missingCredentials_throwsUnauthorized() {
        AuthRequest request = new AuthRequest();
        request.setIdentifier("");
        request.setPassword("password");

        assertThatThrownBy(() -> authService.login(request, httpRequest, httpResponse))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void login_inactiveUser_throwsUnauthorized() {
        AuthRequest request = new AuthRequest();
        request.setIdentifier("test@test.com");
        request.setPassword("password");

        User user = buildValidUser();
        user.setStatus(UserStatusEnum.inactive);
        
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request, httpRequest, httpResponse))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }
    
    @Test
    void login_wrongPassword_throwsUnauthorized() {
        AuthRequest request = new AuthRequest();
        request.setIdentifier("test@test.com");
        request.setPassword("wrong-password");

        User user = buildValidUser();
        
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));
        when(passwordService.matches("wrong-password", "hashedPass")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request, httpRequest, httpResponse))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void refresh_success() {
        Cookie[] cookies = {new Cookie("matchia_refresh_token", "valid-refresh-token")};
        when(httpRequest.getCookies()).thenReturn(cookies);
        when(jwtUtil.validateRefreshToken("valid-refresh-token")).thenReturn(true);
        
        User user = buildValidUser();
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setRevokedAt(null);
        
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(storedToken));
        when(jwtUtil.generateAccessToken(user, "SAAS_ADMIN", "test-bank")).thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken(user, "SAAS_ADMIN", "test-bank")).thenReturn("new-refresh-token");
        when(jwtUtil.getRefreshTokenLifetime()).thenReturn(Duration.ofDays(7));

        AuthResponse response = authService.refresh(httpRequest, httpResponse);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
        verify(httpResponse).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    void refresh_invalidToken_throwsUnauthorized() {
        Cookie[] cookies = {new Cookie("matchia_refresh_token", "invalid-refresh-token")};
        when(httpRequest.getCookies()).thenReturn(cookies);
        when(jwtUtil.validateRefreshToken("invalid-refresh-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(httpRequest, httpResponse))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Refresh token invalid or expired");
    }

    @Test
    void logout_success() {
        Cookie[] cookies = {new Cookie("matchia_refresh_token", "valid-refresh-token")};
        when(httpRequest.getCookies()).thenReturn(cookies);
        
        RefreshToken storedToken = new RefreshToken();
        storedToken.setRevokedAt(null);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(storedToken));

        authService.logout(httpRequest, httpResponse);

        assertThat(storedToken.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(storedToken);
        verify(httpResponse).addHeader(eq("Set-Cookie"), anyString());
    }

    @Test
    void sendPasswordResetLink_success() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setIdentifier("test@test.com");
        
        User user = buildValidUser();
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));

        authService.sendPasswordResetLink(request, httpRequest);

        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetEmail(eq(user), anyString());
    }

    @Test
    void sendPasswordResetLink_noUser_doesNothing() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setIdentifier("test@test.com");
        
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.empty());

        authService.sendPasswordResetLink(request, httpRequest);

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(any(), anyString());
    }

    @Test
    void resetPassword_success() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setPassword("newPassword123");
        request.setConfirmPassword("newPassword123");

        User user = buildValidUser();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setUsedAt(null);
        resetToken.setExpiresAt(Instant.now().plusMillis(10000));
        
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(resetToken));
        when(refreshTokenRepository.findAllByUser_Id(user.getId())).thenReturn(Collections.emptyList());

        authService.resetPassword(request);

        verify(passwordService).setPassword(user, "newPassword123");
        verify(userRepository).save(user);
        assertThat(resetToken.getUsedAt()).isNotNull();
        verify(passwordResetTokenRepository).save(resetToken);
    }

    @Test
    void resetPassword_passwordsNotMatch_throwsBadRequest() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setPassword("newPassword123");
        request.setConfirmPassword("differentPassword");

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Les mots de passe ne correspondent pas");
    }

    @Test
    void getCurrentUser_authenticated_success() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("test@test.com");
        
        User user = buildValidUser();
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));

        AuthResponse response = authService.getCurrentUser(authentication);

        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("test@test.com");
    }

    @Test
    void getCurrentUser_unauthenticated_fallbackToCookie_success() {
        when(authentication.isAuthenticated()).thenReturn(false);
        
        Cookie[] cookies = {new Cookie("matchia_refresh_token", "valid-refresh-token")};
        when(httpRequest.getCookies()).thenReturn(cookies);
        when(jwtUtil.validateRefreshToken("valid-refresh-token")).thenReturn(true);
        
        User user = buildValidUser();
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setRevokedAt(null);
        
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(storedToken));
        when(jwtUtil.generateAccessToken(user, "SAAS_ADMIN", "test-bank")).thenReturn("new-access-token");

        AuthResponse response = authService.getCurrentUser(authentication, httpRequest, httpResponse);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
    }
}
