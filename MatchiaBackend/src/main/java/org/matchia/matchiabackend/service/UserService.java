package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Create or update a User.
     * @param user The User to save.
     * @return The saved User.
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * Users exposed in the SaaS Users backoffice. Client accounts are intentionally
     * excluded so their personal data never leaves their bank scope.
     */
    public List<User> findAllForSaasBackoffice() {
        return userRepository.findByRoleNotOrderByCreatedAtAsc(org.matchia.matchiabackend.entity.enums.RoleEnum.CLIENT);
    }

    /**
     * Users exposed to a bank administrator. The bank is always resolved from the
     * authenticated administrator, never from a request header or request body.
     */
    public List<User> findAllForBankBackoffice(Long bankId) {
        return userRepository.findByBank_IdOrderByCreatedAtAsc(bankId);
    }

    public Optional<User> findDetailedForSaasBackoffice(Long id) {
        return userRepository.findByIdAndRoleNot(id, org.matchia.matchiabackend.entity.enums.RoleEnum.CLIENT);
    }

    public Optional<User> findDetailedForBankBackoffice(Long id, Long bankId) {
        return userRepository.findByIdAndBank_Id(id, bankId);
    }

    /**
     * Find a User by its ID.
     * @param id The ID of the User.
     * @return An Optional containing the User if found.
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmailIgnoreCase(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    /**
     * Delete a User by its ID.
     * @param id The ID of the User to delete.
     */
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
}
