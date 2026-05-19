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
     * Get all Users.
     * @return List of User.
     */
    public List<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * Find a User by its ID.
     * @param id The ID of the User.
     * @return An Optional containing the User if found.
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Delete a User by its ID.
     * @param id The ID of the User to delete.
     */
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
}
