package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Dealer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DealerRepository extends JpaRepository<Dealer, Long> {
    @EntityGraph(attributePaths = "store") Optional<Dealer> findById(Long id);
    boolean existsByRegistrationNumberIgnoreCase(String registrationNumber);
    boolean existsByEmailIgnoreCase(String email);
}
