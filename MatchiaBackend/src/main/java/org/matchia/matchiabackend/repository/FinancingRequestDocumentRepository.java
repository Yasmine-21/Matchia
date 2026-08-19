package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.FinancingRequestDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FinancingRequestDocumentRepository extends JpaRepository<FinancingRequestDocument, Long> {
    Optional<FinancingRequestDocument> findByIdAndFinancingRequest_Id(Long id, Long requestId);
    Optional<FinancingRequestDocument> findByFinancingRequest_IdAndDocumentType(Long requestId, String documentType);
}
