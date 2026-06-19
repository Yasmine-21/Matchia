package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Content;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContentRepository extends JpaRepository<Content, Long> {
    List<Content> findAllByOrderByCreatedAtDesc();
    List<Content> findByStore_IdOrderByCreatedAtDesc(Long storeId);
    List<Content> findByStore_IdInOrderByCreatedAtDesc(Iterable<Long> storeIds);
}
