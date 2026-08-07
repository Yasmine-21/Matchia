package org.matchia.matchiabackend.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.AuthRequest;
import org.matchia.matchiabackend.dto.AuthResponse;
import org.matchia.matchiabackend.dto.ForgotPasswordRequest;
import org.matchia.matchiabackend.dto.ResetPasswordRequest;
import org.matchia.matchiabackend.entity.PasswordResetToken;
import org.matchia.matchiabackend.entity.RefreshToken;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.PasswordResetTokenRepository;
import org.matchia.matchiabackend.repository.RefreshTokenRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.matchia.matchiabackend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordService passwordService;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    @Value("${app.auth.refresh-cookie-name:matchia_refresh_token}")
    private String refreshCookieName;

    @Value("${app.auth.refresh-cookie-secure:false}")
    private boolean refreshCookieSecure;

    @Value("${app.auth.refresh-cookie-same-site:Lax}")
    private String refreshCookieSameSite;

    @Value("${app.auth.refresh-cookie-domain:}")
    private String refreshCookieDomain;

    @Value("${app.auth.password-reset-token-validity-ms:3600000}")
    private long passwordResetTokenValidityMs;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public AuthResponse login(AuthRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String identifier = resolveIdentifier(request);
        String password = request != null ? request.getPassword() : null;

        if (!hasText(identifier) || !hasText(password)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        User user = userRepository.findByEmailIgnoreCase(identifier.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getStatus() == UserStatusEnum.inactive) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (!passwordService.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String role = publicRole(user.getRole());
        String bankSlug = resolveBankSlug(user);

        String accessToken = jwtUtil.generateAccessToken(user, role, bankSlug);
        String refreshToken = jwtUtil.generateRefreshToken(user, role, bankSlug);
        persistRefreshToken(user, refreshToken, httpRequest, null);
        addRefreshCookie(httpResponse, refreshToken);

        return buildAuthResponse(user, accessToken);
    }

    @Transactional
    public AuthResponse refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawRefreshToken = readRefreshToken(httpRequest);
        if (!hasText(rawRefreshToken) || !jwtUtil.validateRefreshToken(rawRefreshToken)) {
            clearRefreshCookie(httpResponse);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid or expired");
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    clearRefreshCookie(httpResponse);
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid or revoked");
                });

        if (!storedToken.isActive()) {
            storedToken.setRevokedAt(Instant.now());
            storedToken.setRevokedReason("EXPIRED_OR_REVOKED");
            refreshTokenRepository.save(storedToken);
            clearRefreshCookie(httpResponse);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid or expired");
        }

        User user = storedToken.getUser();
        if (user == null || user.getStatus() == UserStatusEnum.inactive) {
            clearRefreshCookie(httpResponse);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid or expired");
        }

        String role = publicRole(user.getRole());
        String bankSlug = resolveBankSlug(user);
        String accessToken = jwtUtil.generateAccessToken(user, role, bankSlug);
        String rotatedRefreshToken = jwtUtil.generateRefreshToken(user, role, bankSlug);

        storedToken.setRevokedAt(Instant.now());
        storedToken.setRevokedReason("ROTATED");
        storedToken.setLastUsedAt(Instant.now());
        storedToken.setReplacedByTokenHash(hashToken(rotatedRefreshToken));
        refreshTokenRepository.save(storedToken);

        persistRefreshToken(user, rotatedRefreshToken, httpRequest, storedToken.getTokenFamilyId());
        addRefreshCookie(httpResponse, rotatedRefreshToken);

        return buildAuthResponse(user, accessToken);
    }

    @Transactional
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawRefreshToken = readRefreshToken(httpRequest);
        if (hasText(rawRefreshToken)) {
            refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken)).ifPresent(token -> {
                if (token.getRevokedAt() == null) {
                    token.setRevokedAt(Instant.now());
                    token.setRevokedReason("LOGOUT");
                    token.setLastUsedAt(Instant.now());
                    refreshTokenRepository.save(token);
                }
            });
        }
        clearRefreshCookie(httpResponse);
    }

    @Transactional
    public void sendPasswordResetLink(ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        String identifier = resolveIdentifier(request);
        if (!hasText(identifier)) {
            return;
        }

        userRepository.findByEmailIgnoreCase(identifier.trim()).ifPresent(user -> {
            String rawToken = generateSecureToken();
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setTokenHash(hashToken(rawToken));
            resetToken.setUser(user);
            resetToken.setExpiresAt(Instant.now().plusMillis(passwordResetTokenValidityMs));
            resetToken.setIpAddress(httpRequest != null ? httpRequest.getRemoteAddr() : null);
            resetToken.setUserAgent(httpRequest != null ? httpRequest.getHeader("User-Agent") : null);
            passwordResetTokenRepository.save(resetToken);

            try {
                emailService.sendPasswordResetEmail(user, buildPasswordResetUrl(rawToken));
            } catch (Exception exception) {
                log.error("Failed to send password reset email to {}", user.getEmail(), exception);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token invalid");
        }
        if (!hasText(request.getToken())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token invalid");
        }
        if (!hasText(request.getPassword()) || !hasText(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le mot de passe est obligatoire.");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Les mots de passe ne correspondent pas.");
        }

        passwordService.validateRawPassword(request.getPassword());
        String tokenHash = hashToken(request.getToken());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token invalid or expired"));

        if (!resetToken.isUsable()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token invalid or expired");
        }

        User user = resetToken.getUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token invalid or expired");
        }

        passwordService.setPassword(user, request.getPassword());
        userRepository.save(user);

        resetToken.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(resetToken);

        revokeAllRefreshTokensForUser(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(Authentication authentication) {
        return getCurrentUser(authentication, null, null);
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(Authentication authentication, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (authentication == null || !authentication.isAuthenticated()) {
            User fallbackUser = resolveUserFromRefreshCookie(httpRequest, httpResponse);
            if (fallbackUser != null) {
                String role = publicRole(fallbackUser.getRole());
                String bankSlug = resolveBankSlug(fallbackUser);
                String accessToken = jwtUtil.generateAccessToken(fallbackUser, role, bankSlug);
                return buildAuthResponse(fallbackUser, accessToken);
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        String email = String.valueOf(authentication.getName());
        if (!hasText(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));

        if (user.getStatus() == UserStatusEnum.inactive) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        return buildAuthResponse(user, null);
    }

    private User resolveUserFromRefreshCookie(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawRefreshToken = readRefreshToken(httpRequest);
        if (!hasText(rawRefreshToken) || !jwtUtil.validateRefreshToken(rawRefreshToken)) {
            return null;
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash).orElse(null);
        if (storedToken == null || !storedToken.isActive()) {
            if (storedToken != null) {
                storedToken.setRevokedAt(Instant.now());
                storedToken.setRevokedReason("EXPIRED_OR_REVOKED");
                refreshTokenRepository.save(storedToken);
            }
            clearRefreshCookie(httpResponse);
            return null;
        }

        User user = storedToken.getUser();
        if (user == null || user.getStatus() == UserStatusEnum.inactive) {
            clearRefreshCookie(httpResponse);
            return null;
        }

        return user;
    }

    private AuthResponse buildAuthResponse(User user, String accessToken) {
        AuthResponse response = new AuthResponse();
        response.setId(user != null && user.getId() != null ? String.valueOf(user.getId()) : null);
        response.setToken(accessToken);
        response.setAccessToken(accessToken);
        response.setEmail(user != null ? user.getEmail() : null);
        response.setPhone(user != null ? user.getPhone() : null);
        response.setAddress(user != null ? user.getAddress() : null);
        response.setRole(publicRole(user != null ? user.getRole() : null));
        response.setBankSlug(resolveBankSlug(user));
        response.setBankId(user != null && user.getBank() != null && user.getBank().getId() != null
                ? String.valueOf(user.getBank().getId())
                : null);
        response.setDealerId(user != null && user.getDealer() != null && user.getDealer().getId() != null
                ? String.valueOf(user.getDealer().getId())
                : null);
        response.setName(user != null ? user.getFullName() : null);
        response.setContactImageUrl(user != null ? user.getContactImageUrl() : null);
        return response;
    }

    private void persistRefreshToken(User user, String rawRefreshToken, HttpServletRequest request, String familyId) {
        String tokenFamilyId = hasText(familyId) ? familyId : UUID.randomUUID().toString();
        RefreshToken token = new RefreshToken();
        token.setTokenHash(hashToken(rawRefreshToken));
        token.setTokenId(extractTokenId(rawRefreshToken));
        token.setTokenFamilyId(tokenFamilyId);
        token.setUser(user);
        token.setIssuedAt(Instant.now());
        token.setExpiresAt(Instant.now().plusMillis(jwtUtil.getRefreshTokenLifetime().toMillis()));
        token.setIpAddress(request != null ? request.getRemoteAddr() : null);
        token.setUserAgent(request != null ? request.getHeader("User-Agent") : null);
        refreshTokenRepository.save(token);
    }

    private void revokeAllRefreshTokensForUser(User user) {
        if (user == null || user.getId() == null) {
            return;
        }
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUser_Id(user.getId());
        Instant now = Instant.now();
        for (RefreshToken token : tokens) {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(now);
                token.setRevokedReason("PASSWORD_RESET");
            }
        }
        if (!tokens.isEmpty()) {
            refreshTokenRepository.saveAll(tokens);
        }
    }

    private void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        if (response == null || !hasText(refreshToken)) {
            return;
        }
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path("/")
                .sameSite(refreshCookieSameSite)
                .domain(normalizeCookieDomain(refreshCookieDomain))
                .maxAge(jwtUtil.getRefreshTokenLifetime())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        if (response == null) {
            return;
        }
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path("/")
                .sameSite(refreshCookieSameSite)
                .domain(normalizeCookieDomain(refreshCookieDomain))
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String normalizeCookieDomain(String domain) {
        if (!hasText(domain)) {
            return null;
        }
        String normalized = domain.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String readRefreshToken(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (cookie != null && refreshCookieName.equals(cookie.getName()) && hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String resolveIdentifier(AuthRequest request) {
        if (request == null) {
            return null;
        }
        if (hasText(request.getIdentifier())) {
            return request.getIdentifier();
        }
        return request.getEmail();
    }

    private String resolveIdentifier(ForgotPasswordRequest request) {
        if (request == null) {
            return null;
        }
        if (hasText(request.getIdentifier())) {
            return request.getIdentifier();
        }
        return request.getEmail();
    }

    private String resolveBankSlug(User user) {
        if (user != null && user.getBank() != null && hasText(user.getBank().getSlug())) {
            return user.getBank().getSlug();
        }
        return null;
    }

    private String publicRole(RoleEnum role) {
        if (role == null) {
            return "CLIENT";
        }
        return switch (role) {
            case ADMIN_SAAS -> "SAAS_ADMIN";
            case ADMIN_BANK -> "BANK_ADMIN";
            case DEALER_ADMIN -> "DEALER_ADMIN";
            default -> "CLIENT";
        };
    }

    private String extractTokenId(String rawRefreshToken) {
        if (!hasText(rawRefreshToken)) {
            return UUID.randomUUID().toString();
        }
        try {
            Object tokenId = jwtUtil.extractAllClaims(rawRefreshToken).get("jti");
            if (tokenId != null && hasText(String.valueOf(tokenId))) {
                return String.valueOf(tokenId);
            }
        } catch (Exception ignored) {
            // fallback below
        }
        return UUID.randomUUID().toString();
    }

    private String buildPasswordResetUrl(String rawToken) {
        String baseUrl = hasText(frontendUrl) ? frontendUrl.replaceAll("/+$", "") : "http://localhost:5173";
        return baseUrl + "/reinitialiser-mot-de-passe?token=" + urlEncode(rawToken);
    }

    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash token", exception);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
