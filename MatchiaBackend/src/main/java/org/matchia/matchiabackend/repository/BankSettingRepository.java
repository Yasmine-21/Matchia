package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.BankSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BankSettingRepository extends JpaRepository<BankSetting, Long> {
}
