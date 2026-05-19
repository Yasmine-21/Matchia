package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.BankStoreModule;
import org.matchia.matchiabackend.repository.BankStoreModuleRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BankStoreModuleService {

    private final BankStoreModuleRepository bankStoreModuleRepository;

    public BankStoreModuleService(BankStoreModuleRepository bankStoreModuleRepository) {
        this.bankStoreModuleRepository = bankStoreModuleRepository;
    }

    /**
     * Create or update a BankStoreModule.
     * @param bankStoreModule The BankStoreModule to save.
     * @return The saved BankStoreModule.
     */
    public BankStoreModule save(BankStoreModule bankStoreModule) {
        return bankStoreModuleRepository.save(bankStoreModule);
    }

    /**
     * Get all BankStoreModules.
     * @return List of BankStoreModule.
     */
    public List<BankStoreModule> findAll() {
        return bankStoreModuleRepository.findAll();
    }

    /**
     * Find a BankStoreModule by its ID.
     * @param id The ID of the BankStoreModule.
     * @return An Optional containing the BankStoreModule if found.
     */
    public Optional<BankStoreModule> findById(Long id) {
        return bankStoreModuleRepository.findById(id);
    }

    /**
     * Delete a BankStoreModule by its ID.
     * @param id The ID of the BankStoreModule to delete.
     */
    public void deleteById(Long id) {
        bankStoreModuleRepository.deleteById(id);
    }
}
