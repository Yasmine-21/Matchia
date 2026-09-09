package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.DealerProductDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DealerProductDocumentRepository extends JpaRepository<DealerProductDocument, Long> {
    List<DealerProductDocument> findByProductIdOrderByUploadedAtDesc(Long productId);
    Optional<DealerProductDocument> findByIdAndProductId(Long id, Long productId);
}
