package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.StoreStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByStatus(StoreStatusEnum status);
}
