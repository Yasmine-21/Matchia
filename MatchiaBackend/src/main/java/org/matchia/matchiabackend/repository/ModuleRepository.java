package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    List<Module> findByStatus(ModuleStatusEnum status);
}
