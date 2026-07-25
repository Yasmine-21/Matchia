package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.enums.ModuleStatusEnum;
import org.matchia.matchiabackend.repository.ModuleStoreRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Repairs legacy assignment rows that contradict a module's global inactive state. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleAssignmentConsistencyService {

    private final ModuleStoreRepository moduleStoreRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void deactivateAssignmentsForGloballyInactiveModules() {
        int updated = moduleStoreRepository.deactivateAssignmentsForModulesWithStatus(ModuleStatusEnum.inactive);
        if (updated > 0) {
            log.info("Disabled {} module-store assignment(s) for globally inactive modules.", updated);
        }
    }
}
