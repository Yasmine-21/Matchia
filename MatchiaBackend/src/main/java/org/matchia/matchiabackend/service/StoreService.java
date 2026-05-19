package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.StoreDto;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.mapper.StoreMapper;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final StoreMapper storeMapper;

    public List<StoreDto> getAllStores() {
        return storeRepository.findAll()
                .stream()
                .map(storeMapper::toDto)
                .collect(Collectors.toList());
    }

    public StoreDto createStore(StoreDto storeDto) {
        Store store = storeMapper.toEntity(storeDto);
        return storeMapper.toDto(storeRepository.save(store));
    }
    public StoreDto updateStore(Long id, StoreDto storeDto) {
        // 1. On vérifie si le store existe
        Store existingStore = storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store non trouvé"));

        // 2. On met à jour les champs
        existingStore.setName(storeDto.getName());
        existingStore.setDescription(storeDto.getDescription());
        existingStore.setIcon(storeDto.getIcon());
        existingStore.setStatus(storeDto.getStatus());

        // 3. On sauvegarde
        return storeMapper.toDto(storeRepository.save(existingStore));
    }

    public void deleteStore(Long id) {
        storeRepository.deleteById(id);
    }
}
