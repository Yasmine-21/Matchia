package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Dealer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;

public interface DealerRepository extends JpaRepository<Dealer, Long> {
    @EntityGraph(attributePaths = "store") Optional<Dealer> findById(Long id);
    @EntityGraph(attributePaths = "store") List<Dealer> findByStatusOrderByCompanyNameAsc(DealerStatusEnum status);
    @EntityGraph(attributePaths = "store")
    List<Dealer> findByStore_IdAndStatusOrderByCompanyNameAsc(Long storeId, DealerStatusEnum status);
    boolean existsByRegistrationNumberIgnoreCase(String registrationNumber);
    boolean existsByRegistrationNumberIgnoreCaseAndIdNot(String registrationNumber, Long id);
    boolean existsByEmailIgnoreCase(String email);
}
