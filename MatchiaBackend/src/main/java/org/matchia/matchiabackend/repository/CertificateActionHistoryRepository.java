package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.CertificateActionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateActionHistoryRepository extends JpaRepository<CertificateActionHistory, Long> {
    List<CertificateActionHistory> findByCertificate_IdOrderByPerformedAtDesc(Long certificateId);
}
