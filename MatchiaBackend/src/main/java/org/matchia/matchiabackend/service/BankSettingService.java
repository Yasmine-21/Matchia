package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.BankSetting;
import org.matchia.matchiabackend.repository.BankSettingRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BankSettingService {

    private final BankSettingRepository bankSettingRepository;

    public BankSettingService(BankSettingRepository bankSettingRepository) {
        this.bankSettingRepository = bankSettingRepository;
    }

    /**
     * Create or update a BankSetting.
     * @param bankSetting The BankSetting to save.
     * @return The saved BankSetting.
     */
    public BankSetting save(BankSetting bankSetting) {
        return bankSettingRepository.save(bankSetting);
    }

    /**
     * Get all BankSettings.
     * @return List of BankSetting.
     */
    public List<BankSetting> findAll() {
        return bankSettingRepository.findAll();
    }

    /**
     * Find a BankSetting by its ID.
     * @param id The ID of the BankSetting.
     * @return An Optional containing the BankSetting if found.
     */
    public Optional<BankSetting> findById(Long id) {
        return bankSettingRepository.findById(id);
    }

    /**
     * Delete a BankSetting by its ID.
     * @param id The ID of the BankSetting to delete.
     */
    public void deleteById(Long id) {
        bankSettingRepository.deleteById(id);
    }
}
