package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Set;

/** Resolves the audit actor from the authenticated security context, never from a business payload. */
@Service
@RequiredArgsConstructor
public class AuditActorResolver {

    private static final String SYSTEM_ID = "SYSTEM";
    private static final String SYSTEM_NAME = "System";
    private static final String SYSTEM_EMAIL = "system@matchia.internal";
    private static final Set<String> SYSTEM_SOURCES = Set.of(
            "AUTOMATION", "PAYMENT_WEBHOOK", "SCHEDULER", "EVENT_LISTENER", "EMAIL_AUTOMATION"
    );

    private final UserRepository userRepository;

    public AuditLogRequest resolve(AuditLogRequest audit) {
        if (audit == null) {
            return null;
        }
        if (isSystemSource(audit.getSource())) {
            return applySystemActor(audit);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (isAuthenticated(authentication)) {
            return applyAuthenticatedActor(audit, authentication);
        }

        if (!hasText(audit.getActorName())) {
            audit.setActorName("Anonymous");
            audit.setActorRole("ANONYMOUS");
            audit.setSource(defaultText(audit.getSource(), "PUBLIC_API"));
        } else {
            audit.setSource(defaultText(audit.getSource(), "AUTHENTICATION"));
        }
        return audit;
    }

    public AuditLogRequest systemEvent(AuditLogRequest audit, String source) {
        audit.setSource(source);
        return applySystemActor(audit);
    }

    private AuditLogRequest applyAuthenticatedActor(AuditLogRequest audit, Authentication authentication) {
        String email = String.valueOf(authentication.getPrincipal());
        User user = userRepository.findByEmail(email).orElse(null);
        String role = user != null && user.getRole() != null
                ? normalizeRole(user.getRole().name())
                : normalizeRole(authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .findFirst()
                        .orElse(null));

        audit.setActorId(user != null && user.getId() != null ? String.valueOf(user.getId()) : email);
        audit.setActorEmail(user != null && hasText(user.getEmail()) ? user.getEmail() : email);
        audit.setActorName(user != null && hasText(user.getFullName()) ? user.getFullName() : email);
        audit.setActorRole(role);
        audit.setSource(defaultText(audit.getSource(), "ADMIN_SAAS".equals(role) ? "SAAS_BACK_OFFICE" : "BANK_BACK_OFFICE"));
        return audit;
    }

    private AuditLogRequest applySystemActor(AuditLogRequest audit) {
        audit.setActorId(SYSTEM_ID);
        audit.setActorEmail(SYSTEM_EMAIL);
        audit.setActorName(SYSTEM_NAME);
        audit.setActorRole("SYSTEM");
        audit.setSource(defaultText(audit.getSource(), "AUTOMATION"));
        return audit;
    }

    private boolean isSystemSource(String source) {
        return hasText(source) && SYSTEM_SOURCES.contains(source.trim().toUpperCase());
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() != null
                && !"anonymousUser".equals(authentication.getPrincipal());
    }

    private String normalizeRole(String value) {
        if (!hasText(value)) {
            return "USER";
        }
        String role = value.replace("ROLE_", "").trim();
        if (RoleEnum.ADMIN_BANK.name().equals(role)) {
            return "BANK_ADMIN";
        }
        return role;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String defaultText(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }
}
