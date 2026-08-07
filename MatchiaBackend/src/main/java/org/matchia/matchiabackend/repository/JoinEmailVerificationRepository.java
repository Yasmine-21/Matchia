package org.matchia.matchiabackend.repository;

import jakarta.persistence.LockModeType;
import org.matchia.matchiabackend.entity.JoinEmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JoinEmailVerificationRepository extends JpaRepository<JoinEmailVerification, Long> {

    Optional<JoinEmailVerification> findFirstByEmailOrderByCreatedAtDesc(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<JoinEmailVerification> findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<JoinEmailVerification> findByVerificationTokenHash(String verificationTokenHash);
}
