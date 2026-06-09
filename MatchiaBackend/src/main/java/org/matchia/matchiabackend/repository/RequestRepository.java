package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestRepository extends JpaRepository<Request,Long> {
    boolean existsByMarketplaceSlug(String marketplaceSlug);
    long countByStatus(RequestStatusEnum status);
    List<Request> findByStatusOrderByCreatedAtDesc(RequestStatusEnum status);
}
