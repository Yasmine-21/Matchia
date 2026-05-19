package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}
