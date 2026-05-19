package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.BankStore;
import org.matchia.matchiabackend.repository.BankStoreRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BankStoreService {

    private final BankStoreRepository bankStoreRepository;

    public BankStoreService(BankStoreRepository bankStoreRepository) {
        this.bankStoreRepository = bankStoreRepository;
    }

    /**
     * Create or update a BankStore.
     * @param bankStore The BankStore to save.
     * @return The saved BankStore.
     */
    public BankStore save(BankStore bankStore) {
        return bankStoreRepository.save(bankStore);
    }

    /**
     * Get all BankStores.
     * @return List of BankStore.
     */
    public List<BankStore> findAll() {
        return bankStoreRepository.findAll();
    }

    /**
     * Find a BankStore by its ID.
     * @param id The ID of the BankStore.
     * @return An Optional containing the BankStore if found.
     */
    public Optional<BankStore> findById(Long id) {
        return bankStoreRepository.findById(id);
    }

    /**
     * Delete a BankStore by its ID.
     * @param id The ID of the BankStore to delete.
     */
    public void deleteById(Long id) {
        bankStoreRepository.deleteById(id);
    }
}
