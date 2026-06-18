package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.AuthRequest;
import org.matchia.matchiabackend.dto.AuthResponse;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.matchia.matchiabackend.security.JwtUtil;
import org.matchia.matchiabackend.service.AuditLogger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final AuditLogger auditLogger;
    private final UserRepository userRepository;

    public AuthController(JwtUtil jwtUtil, AuditLogger auditLogger, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.auditLogger = auditLogger;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        String email = request.getEmail();
        String password = request.getPassword();

        var user = userRepository.findByEmail(email);
        if (user.isPresent()) {
            User dbUser = user.get();
            if (dbUser.getStatus() == UserStatusEnum.inactive) {
                auditLogger.logAsync(loginAudit(email, null, "user.login_failed", AuditStatusEnum.failure, httpRequest, "{\"reason\":\"inactive_user\"}"));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
            }
            if (dbUser.getPassword() == null || !dbUser.getPassword().equals(password)) {
                auditLogger.logAsync(loginAudit(email, null, "user.login_failed", AuditStatusEnum.failure, httpRequest, "{\"reason\":\"bad_password\"}"));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
            }

            String role = toAuthRole(dbUser.getRole());
            String bankSlug = dbUser.getBank() != null ? dbUser.getBank().getSlug() : null;
            String bankId = dbUser.getBank() != null && dbUser.getBank().getId() != null
                    ? String.valueOf(dbUser.getBank().getId())
                    : null;

            String token = jwtUtil.generateToken(email, role, bankSlug);

            AuthResponse response = new AuthResponse();
            response.setToken(token);
            response.setEmail(email);
            response.setRole(role);
            response.setBankSlug(bankSlug);
            response.setBankId(bankId);
            response.setName(dbUser.getFullName());

            auditLogger.logAsync(loginAudit(email, role, "user.login", AuditStatusEnum.success, httpRequest, null));
            return ResponseEntity.ok(response);
        }

        if (!"admin123".equals(password)) {
            auditLogger.logAsync(loginAudit(email, null, "user.login_failed", AuditStatusEnum.failure, httpRequest, "{\"reason\":\"bad_password\"}"));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String role = null;
        String bankSlug = null;
        String name = "";

        if ("admin@matchia.com".equals(email)) {
            role = "ADMIN_SAAS";
            name = "Mariem Trabelsi";
        } else if ("ahmed@zitouna.com".equals(email)) {
            role = "ADMIN_SAAS";
            bankSlug = "zitouna";
            name = "Ahmed Ben Ali";
        } else if ("fatma@bhbank.com".equals(email)) {
            role = "ADMIN_BANK";
            bankSlug = "bh";
            name = "Fatma Gharbi";
        } else {
            auditLogger.logAsync(loginAudit(email, null, "user.login_failed", AuditStatusEnum.failure, httpRequest, "{\"reason\":\"unknown_user\"}"));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = jwtUtil.generateToken(email, role, bankSlug);

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setEmail(email);
        response.setRole(role);
        response.setBankSlug(bankSlug);
        response.setBankId(bankSlug == null ? null : ("zitouna".equals(bankSlug) ? "1" : ("bh".equals(bankSlug) ? "2" : null)));
        response.setName(name);

        auditLogger.logAsync(loginAudit(email, role, "user.login", AuditStatusEnum.success, httpRequest, null));
        return ResponseEntity.ok(response);
    }

    private String toAuthRole(RoleEnum role) {
        if (role == null) {
            return "CLIENT";
        }
        return role.name();
    }

    private AuditLogRequest loginAudit(String email, String role, String action, AuditStatusEnum status, HttpServletRequest request, String metadata) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setActorId(email);
        audit.setActorName(email);
        audit.setActorRole(role);
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.security);
        audit.setResourceType("session");
        audit.setResourceId(email);
        audit.setStatus(status);
        audit.setIpAddress(request.getRemoteAddr());
        audit.setUserAgent(request.getHeader("User-Agent"));
        audit.setMetadata(metadata);
        return audit;
    }
}
