package org.matchia.matchiabackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtSecurityTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generatesAndValidatesTypedTokensWithBankClaims() {
        JwtUtil util = new JwtUtil("a-secure-test-secret-longer-than-thirty-two-bytes", 60_000, 120_000);
        Bank bank = new Bank();
        bank.setId(9L);
        User user = new User();
        user.setEmail("user@example.com");
        user.setBank(bank);

        String access = util.generateAccessToken(user, "bank_admin", "bank");
        String refresh = util.generateRefreshToken(user, "bank_admin", "bank");
        assertThat(util.validateAccessToken(access)).isTrue();
        assertThat(util.validateRefreshToken(access)).isFalse();
        assertThat(util.validateRefreshToken(refresh)).isTrue();
        assertThat(util.extractEmail(access)).isEqualTo("user@example.com");
        assertThat(util.extractBankSlug(access)).isEqualTo("bank");
        assertThat(util.getAccessTokenLifetime().toMillis()).isEqualTo(60_000);
        assertThat(util.validateToken("not-a-token")).isFalse();
    }

    @Test
    void filterPassesThroughMissingInvalidAndValidTokens() throws Exception {
        JwtUtil util = new JwtUtil("a-secure-test-secret-longer-than-thirty-two-bytes", 60_000, 120_000);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(util);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);
        verify(chain).doFilter(request, response);
        clearSecurityContext();
        reset(chain);
        when(request.getHeader("Authorization")).thenReturn("Bearer malformed");
        filter.doFilterInternal(request, response, chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

        String token = util.generateToken("admin@example.com", "saas_admin", null);
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        filter.doFilterInternal(request, response, chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("admin@example.com");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting(Object::toString).contains("ROLE_saas_admin");
        verify(chain, times(2)).doFilter(request, response);
    }

    @Test
    void writesJsonErrorsForUnauthenticatedAndDeniedRequests() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter output = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(output));

        new RestAuthenticationEntryPoint().commence(request, response, null);
        assertThat(output.toString()).contains("Authentication required");
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        reset(response);
        output = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(output));
        new RestAccessDeniedHandler().handle(request, response, new AccessDeniedException("no"));
        assertThat(output.toString()).contains("Access denied");
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }
}
