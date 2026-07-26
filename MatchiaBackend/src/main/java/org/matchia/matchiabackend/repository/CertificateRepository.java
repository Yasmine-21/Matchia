package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Certificate;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    @Override
    @EntityGraph(attributePaths = {"bank", "marketplace", "marketplace.bank"})
    List<Certificate> findAll();

    @Override
    @EntityGraph(attributePaths = {"bank", "marketplace", "marketplace.bank"})
    Optional<Certificate> findById(Long id);

    @EntityGraph(attributePaths = {"bank", "marketplace", "marketplace.bank"})
    List<Certificate> findAllByOrderByExpirationDateAsc();

    @EntityGraph(attributePaths = {"bank", "marketplace", "marketplace.bank"})
    List<Certificate> findByStatusInOrderByExpirationDateAsc(Collection<CertificateStatusEnum> statuses);

    @EntityGraph(attributePaths = {"bank", "marketplace", "marketplace.bank"})
    List<Certificate> findByExpirationDateBetweenOrderByExpirationDateAsc(LocalDate start, LocalDate end);
}
