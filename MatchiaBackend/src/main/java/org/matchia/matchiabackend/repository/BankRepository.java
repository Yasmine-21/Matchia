package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankRepository extends JpaRepository <Bank, Long>{
}
