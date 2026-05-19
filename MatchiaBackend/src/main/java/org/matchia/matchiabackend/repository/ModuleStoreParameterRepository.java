package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ModuleStoreParameter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleStoreParameterRepository extends JpaRepository<ModuleStoreParameter, Long> {


    List<ModuleStoreParameter> findByModuleStoreId(Long moduleStoreId);

    // Supprimer tous les paramètres d'un module store
    void deleteByModuleStoreId(Long moduleStoreId);
}
