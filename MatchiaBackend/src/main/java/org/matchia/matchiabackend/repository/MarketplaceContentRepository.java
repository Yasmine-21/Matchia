package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.MarketplaceContent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarketplaceContentRepository extends JpaRepository<MarketplaceContent, Long> {
    @EntityGraph(attributePaths = {"marketplace", "store"})
    List<MarketplaceContent> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"marketplace", "store"})
    List<MarketplaceContent> findByMarketplace_Bank_SlugOrderByCreatedAtDesc(String marketplaceSlug);
}
