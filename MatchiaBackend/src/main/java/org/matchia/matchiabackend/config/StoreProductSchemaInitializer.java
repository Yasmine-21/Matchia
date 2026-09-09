package org.matchia.matchiabackend.config;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.entity.ProductParameterDefinition;
import org.matchia.matchiabackend.repository.ProductParameterDefinitionRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.matchia.matchiabackend.service.StoreProductSchema;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

/** Adds missing standard attributes only; existing stores, products and custom attributes are preserved. */
@Configuration
@RequiredArgsConstructor
public class StoreProductSchemaInitializer {
    private final StoreRepository storeRepository;
    private final ProductParameterDefinitionRepository definitionRepository;

    @Bean
    ApplicationRunner initializeStoreProductSchemas() {
        return args -> initialize();
    }

    @Transactional
    void initialize() {
        storeRepository.findAll().forEach(store -> StoreProductSchema.parametersFor(store.getName()).forEach(name -> {
            if (!definitionRepository.existsByStoreIdAndNameIgnoreCase(store.getId(), name)) {
                ProductParameterDefinition definition = new ProductParameterDefinition();
                definition.setStore(store);
                definition.setName(name);
                definitionRepository.save(definition);
            }
        }));
    }
}
