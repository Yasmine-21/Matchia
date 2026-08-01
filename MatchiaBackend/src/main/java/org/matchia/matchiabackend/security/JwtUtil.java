package org.matchia.matchiabackend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.matchia.matchiabackend.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtUtil(
            @Value("${app.auth.jwt-secret:MatchiaAuthDevSecretKey-ChangeMe-For-Production-1234567890}") String secret,
            @Value("${app.auth.access-token-expiration-ms:900000}") long accessTokenExpirationMs,
            @Value("${app.auth.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs
    ) {
        this.key = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateToken(String email, String role, String bankSlug) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("tokenType", TOKEN_TYPE_ACCESS);
        if (bankSlug != null && !bankSlug.isEmpty()) {
            claims.put("bankSlug", bankSlug);
        }

        return buildToken(email, claims, accessTokenExpirationMs);
    }

    public String generateAccessToken(User user, String role, String bankSlug) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("tokenType", TOKEN_TYPE_ACCESS);
        if (bankSlug != null && !bankSlug.isBlank()) {
            claims.put("bankSlug", bankSlug);
        }
        if (user != null && user.getBank() != null && user.getBank().getId() != null) {
            claims.put("bankId", user.getBank().getId());
        }
        return buildToken(user != null ? user.getEmail() : null, claims, accessTokenExpirationMs);
    }

    public String generateRefreshToken(User user, String role, String bankSlug) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("tokenType", TOKEN_TYPE_REFRESH);
        claims.put("jti", UUID.randomUUID().toString());
        if (bankSlug != null && !bankSlug.isBlank()) {
            claims.put("bankSlug", bankSlug);
        }
        if (user != null && user.getBank() != null && user.getBank().getId() != null) {
            claims.put("bankId", user.getBank().getId());
        }
        return buildToken(user != null ? user.getEmail() : null, claims, refreshTokenExpirationMs);
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractTokenType(String token) {
        Claims claims = extractAllClaims(token);
        Object tokenType = claims.get("tokenType");
        return tokenType != null ? String.valueOf(tokenType) : TOKEN_TYPE_ACCESS;
    }

    public String extractBankSlug(String token) {
        Claims claims = extractAllClaims(token);
        Object bankSlug = claims.get("bankSlug");
        return bankSlug != null ? String.valueOf(bankSlug) : null;
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean validateAccessToken(String token) {
        return validateToken(token) && TOKEN_TYPE_ACCESS.equalsIgnoreCase(extractTokenType(token));
    }

    public boolean validateRefreshToken(String token) {
        return validateToken(token) && TOKEN_TYPE_REFRESH.equalsIgnoreCase(extractTokenType(token));
    }

    public Duration getAccessTokenLifetime() {
        return Duration.ofMillis(accessTokenExpirationMs);
    }

    public Duration getRefreshTokenLifetime() {
        return Duration.ofMillis(refreshTokenExpirationMs);
    }

    private String buildToken(String subject, Map<String, Object> claims, long expirationMs) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    private byte[] normalizeSecret(String secret) {
        if (secret == null) {
            secret = "";
        }
        String trimmed = secret.trim();
        byte[] bytes = trimmed.getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= 32) {
            return bytes;
        }
        StringBuilder builder = new StringBuilder(trimmed);
        while (builder.toString().getBytes(StandardCharsets.UTF_8).length < 32) {
            builder.append("0");
        }
        return builder.toString().getBytes(StandardCharsets.UTF_8);
    }
}
