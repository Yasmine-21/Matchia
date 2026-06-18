package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = "bank")
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = "bank")
    List<User> findByBank_Slug(String slug);

    @EntityGraph(attributePaths = "bank")
    List<User> findByBank_IdOrderByCreatedAtAsc(Long bankId);

    @EntityGraph(attributePaths = "bank")
    List<User> findByRoleOrderByCreatedAtAsc(RoleEnum role);

    @EntityGraph(attributePaths = "bank")
    Optional<User> findById(Long id);

    @EntityGraph(attributePaths = "bank")
    Optional<User> findByIdAndBank_Slug(Long id, String slug);

    boolean existsByEmail(String email);
}
