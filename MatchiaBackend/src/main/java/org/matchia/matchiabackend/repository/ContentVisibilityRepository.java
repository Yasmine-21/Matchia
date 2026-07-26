package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ContentVisibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContentVisibilityRepository extends JpaRepository<ContentVisibility, Long> {
    List<ContentVisibility> findByMarketplace_Bank_Slug(String marketplaceSlug);

    Optional<ContentVisibility> findByMarketplace_IdAndContent_Id(Long marketplaceId, Long contentId);

    Optional<ContentVisibility> findByMarketplace_Bank_SlugAndContent_Id(String marketplaceSlug, Long contentId);
}
