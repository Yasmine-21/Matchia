package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.DealerProductCatalogImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DealerProductCatalogImageRepository extends JpaRepository<DealerProductCatalogImage, Long> {
    List<DealerProductCatalogImage> findByProductIdOrderByDisplayOrderAsc(Long productId);
    Optional<DealerProductCatalogImage> findByIdAndProductId(Long id, Long productId);
    long countByProductId(Long productId);
}
