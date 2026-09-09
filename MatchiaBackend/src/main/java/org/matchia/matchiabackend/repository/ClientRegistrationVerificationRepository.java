package org.matchia.matchiabackend.repository;

import jakarta.persistence.LockModeType;
import org.matchia.matchiabackend.entity.ClientRegistrationVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface ClientRegistrationVerificationRepository extends JpaRepository<ClientRegistrationVerification, Long> {

    Optional<ClientRegistrationVerification> findFirstByEmailOrderByCreatedAtDesc(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ClientRegistrationVerification> findFirstByEmailAndInvalidatedAtIsNullAndConsumedAtIsNullOrderByCreatedAtDesc(String email);
}
