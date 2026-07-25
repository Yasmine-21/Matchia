package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class PasswordService implements ApplicationRunner {

    private static final Pattern BCRYPT_HASH = Pattern.compile("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public PasswordService(PasswordEncoder passwordEncoder, UserRepository userRepository) {
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    public String encode(String rawPassword) {
        validateRawPassword(rawPassword);
        if (isBcryptHash(rawPassword)) {
            throw new IllegalArgumentException("Le mot de passe fourni ne doit pas deja etre hache.");
        }
        return passwordEncoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String storedHash) {
        return hasText(rawPassword) && isBcryptHash(storedHash) && passwordEncoder.matches(rawPassword, storedHash);
    }

    public void setPassword(User user, String rawPassword) {
        if (user == null) {
            throw new IllegalArgumentException("Utilisateur introuvable.");
        }
        user.setPassword(encode(rawPassword));
    }

    public String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(12);
        for (int index = 0; index < 12; index++) {
            password.append(PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    public boolean isBcryptHash(String value) {
        return hasText(value) && BCRYPT_HASH.matcher(value).matches();
    }

    public void validateRawPassword(String rawPassword) {
        if (!hasText(rawPassword)) {
            throw new IllegalArgumentException("Le mot de passe est obligatoire.");
        }
        if (rawPassword.length() < 8) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins 8 caracteres.");
        }
    }

    /** One-time startup migration: legacy clear-text values are replaced by BCrypt hashes. */
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<User> legacyUsers = userRepository.findAll().stream()
                .filter(user -> hasText(user.getPassword()) && !isBcryptHash(user.getPassword()))
                .toList();
        for (User user : legacyUsers) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (!legacyUsers.isEmpty()) {
            userRepository.saveAll(legacyUsers);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
