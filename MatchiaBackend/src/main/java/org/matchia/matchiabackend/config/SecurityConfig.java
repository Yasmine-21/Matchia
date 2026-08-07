package org.matchia.matchiabackend.config;

import org.matchia.matchiabackend.security.JwtAuthenticationFilter;
import org.matchia.matchiabackend.security.RestAccessDeniedHandler;
import org.matchia.matchiabackend.security.RestAuthenticationEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh", "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/admin/marketplaces/public/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/contents/marketplace/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/marketplace-contents/marketplace/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/banks/**", "/stores/**", "/modules/**", "/products/**", "/modulestores/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/marketplace-stores/**", "/api/v1/marketplace-store-modules/**", "/api/v1/bankbrandings/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/join-requests", "/api/join-requests/email-verification/**", "/api/v1/users/upload-contact-image").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/public/dealers/requests").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/dealers/marketplaces/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/config").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/payments/create-payment-intent", "/api/payments/create-checkout-session", "/api/payments/*/confirm", "/api/payments/checkout-session/*/confirm", "/api/payments/*/renewal").permitAll()
                        .requestMatchers("/chatbot/**", "/uploads/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:5173",
                "http://lvh.me:5173",
                "http://192.168.100.15:5173"
        ));
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://*.lvh.me:5173",
                "http://*.lvh.me:8081",
                "http://localhost:*"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
