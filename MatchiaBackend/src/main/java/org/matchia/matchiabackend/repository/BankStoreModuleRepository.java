package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.BankStoreModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BankStoreModuleRepository extends JpaRepository<BankStoreModule, Long> {
}
