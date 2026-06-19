package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.ProductParameterValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductParameterValueRepository extends JpaRepository<ProductParameterValue, Long> {

    List<ProductParameterValue> findByProductId(Long productId);

    void deleteByParameterDefinitionId(Long parameterDefinitionId);
}
