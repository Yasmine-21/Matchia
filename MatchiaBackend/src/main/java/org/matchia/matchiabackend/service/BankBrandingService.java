package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.BankBranding;
import org.matchia.matchiabackend.repository.BankBrandingRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BankBrandingService {

    private final BankBrandingRepository bankBrandingRepository;

    public BankBrandingService(BankBrandingRepository bankBrandingRepository) {
        this.bankBrandingRepository = bankBrandingRepository;
    }

    /**
     * Create or update a BankBranding.
     * @param bankBranding The BankBranding to save.
     * @return The saved BankBranding.
     */
    public BankBranding save(BankBranding bankBranding) {
        return bankBrandingRepository.save(bankBranding);
    }

    /**
     * Get all BankBrandings.
     * @return List of BankBranding.
     */
    public List<BankBranding> findAll() {
        return bankBrandingRepository.findAll();
    }

    /**
     * Find a BankBranding by its ID.
     * @param id The ID of the BankBranding.
     * @return An Optional containing the BankBranding if found.
     */
    public Optional<BankBranding> findById(Long id) {
        return bankBrandingRepository.findById(id);
    }

    /**
     * Delete a BankBranding by its ID.
     * @param id The ID of the BankBranding to delete.
     */
    public void deleteById(Long id) {
        bankBrandingRepository.deleteById(id);
    }
}
