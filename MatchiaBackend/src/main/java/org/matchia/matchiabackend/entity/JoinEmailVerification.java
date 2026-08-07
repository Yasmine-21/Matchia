package org.matchia.matchiabackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "join_email_verifications",
        indexes = {
                @Index(name = "idx_join_email_verification_email", columnList = "email"),
                @Index(name = "idx_join_email_verification_token", columnList = "verification_token_hash", unique = true)
        }
)
public class JoinEmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "code_hash", nullable = false, length = 100)
    private String codeHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "invalidated_at")
    private Instant invalidatedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "verification_token_hash", unique = true, length = 64)
    private String verificationTokenHash;

    @Column(name = "verification_token_expires_at")
    private Instant verificationTokenExpiresAt;
}
