package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface BankRepository extends JpaRepository <Bank, Long>{
    boolean existsBySlug(String slug);
    Optional<Bank> findBySlug(String slug);
    List<Bank> findAllByOrderByCreatedAtDesc();
}
