package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.RequiredFinancingDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequiredFinancingDocumentRepository extends JpaRepository<RequiredFinancingDocument, Long> {
    List<RequiredFinancingDocument> findByBank_IdAndStore_IdAndActiveTrueOrderByIdAsc(Long bankId, Long storeId);
}
