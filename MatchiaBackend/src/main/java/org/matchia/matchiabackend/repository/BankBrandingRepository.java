package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.BankBranding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BankBrandingRepository extends JpaRepository<BankBranding, Long> {
}
