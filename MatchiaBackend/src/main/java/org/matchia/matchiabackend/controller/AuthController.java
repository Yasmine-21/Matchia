package org.matchia.matchiabackend.controller;

import org.matchia.matchiabackend.dto.AuthRequest;
import org.matchia.matchiabackend.dto.AuthResponse;
import org.matchia.matchiabackend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;

    public AuthController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        // Hardcoded demo authentication logic
        String email = request.getEmail();
        String password = request.getPassword();

        if (!"admin123".equals(password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String role = null;
        String bankSlug = null;
        String name = "";
        String bankId = null;

        if ("admin@matchia.com".equals(email)) {
            role = "SUPER_ADMIN";
            name = "Mariem Trabelsi";
        } else if ("ahmed@zitouna.com".equals(email)) {
            role = "SUPER_ADMIN";
            bankSlug = "zitouna";
            bankId = "1";
            name = "Ahmed Ben Ali";
        } else if ("fatma@bhbank.com".equals(email)) {
            role = "BANK_ADMIN";
            bankSlug = "bh";
            bankId = "2";
            name = "Fatma Gharbi";
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = jwtUtil.generateToken(email, role, bankSlug);

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setEmail(email);
        response.setRole(role);
        response.setBankSlug(bankSlug);
        response.setName(name);

        return ResponseEntity.ok(response);
    }
}
