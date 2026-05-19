package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RequestRepository extends JpaRepository<Request,Long> {
}
