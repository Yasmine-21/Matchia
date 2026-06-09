package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = "bank")
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
