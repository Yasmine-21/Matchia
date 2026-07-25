package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ModuleStore;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleStoreRepository extends JpaRepository<ModuleStore, Long> {

    // Récupérer tous les modules assignés à un store (triés par ordre)
    List<ModuleStore> findByStoreIdOrderByOrdreAsc(Long storeId);

    // Récupérer une assignation spécifique par storeId et moduleId
    Optional<ModuleStore> findByStoreIdAndModuleId(Long storeId, Long moduleId);

    // Récupérer seulement les modules actifs d'un store
    List<ModuleStore> findByStoreIdAndActifTrueOrderByOrdreAsc(Long storeId);

    List<ModuleStore> findByStoreIdAndActifTrueAndModuleStatusOrderByOrdreAsc(Long storeId, ModuleStatusEnum status);

    // Vérifier si une assignation existe
    boolean existsByStoreIdAndModuleId(Long storeId, Long moduleId);

    // Compter le nombre de modules assignés à un store
    long countByStoreId(Long storeId);

    // Supprimer une assignation
    void deleteByStoreIdAndModuleId(Long storeId, Long moduleId);

    long countByStoreIdAndActifTrueAndModuleStatus(Long storeId, ModuleStatusEnum status);

    /** Disables every store assignment for a globally inactive module in the caller's transaction. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update ModuleStore moduleStore
            set moduleStore.actif = false
            where moduleStore.module.id = :moduleId
              and (moduleStore.actif = true or moduleStore.actif is null)
            """)
    int deactivateAssignmentsByModuleId(@Param("moduleId") Long moduleId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update ModuleStore moduleStore
            set moduleStore.actif = false
            where moduleStore.module.status = :moduleStatus
              and (moduleStore.actif = true or moduleStore.actif is null)
            """)
    int deactivateAssignmentsForModulesWithStatus(@Param("moduleStatus") ModuleStatusEnum moduleStatus);

}
