package org.matchia.matchiabackend.mapper;

import org.hibernate.Hibernate;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.dto.RequestModuleSelectionDto;
import org.matchia.matchiabackend.dto.RequestStoreSelectionDto;
import org.matchia.matchiabackend.entity.Module;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.RequestModuleSelection;
import org.matchia.matchiabackend.entity.RequestStoreSelection;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@lombok.RequiredArgsConstructor
public class RequestMapper {

    private final UserRepository userRepository;

    public RequestDto toDto(Request entity) {
        if (entity == null) return null;

        RequestDto dto = new RequestDto();
        dto.setId(entity.getId());
        dto.setBankId(entity.getBank() != null ? entity.getBank().getId() : null);
        dto.setRequestType(entity.getRequestType());
        dto.setStatus(entity.getStatus());
        dto.setPriority(entity.getPriority());
        dto.setRejectionReason(entity.getRejectionReason());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setBankName(entity.getBankName());
        dto.setBankEmail(entity.getBankEmail());
        dto.setLogoUrl(entity.getLogoUrl());
        dto.setCountry(entity.getCountry());
        dto.setWebsite(entity.getWebsite());
        dto.setContactName(entity.getContactName());
        dto.setContactEmail(entity.getContactEmail());
        dto.setContactPhone(entity.getContactPhone());
        dto.setContactImageUrl(entity.getContactImageUrl());
        populateAdminContact(entity, dto);
        dto.setDescription(entity.getDescription());
        dto.setBankDescription(entity.getBankDescription());
        dto.setEstablishmentYear(entity.getEstablishmentYear());
        dto.setMarketplaceSlug(entity.getMarketplaceSlug());
        dto.setMarketplaceDescription(entity.getMarketplaceDescription());
        dto.setPrimaryColor(entity.getPrimaryColor());
        dto.setSecondaryColor(entity.getSecondaryColor());
        dto.setBanniereUrl(entity.getBanniereUrl());
        dto.setSelectedStores(entity.getSelectedStores());
        dto.setSelectedModules(entity.getSelectedModules());
        if (entity.getSelectedStoreDetails() != null && Hibernate.isInitialized(entity.getSelectedStoreDetails())) {
            dto.setSelectedStoreDetails(toStoreSelectionDtos(entity.getSelectedStoreDetails()));
        }
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setTotalMonthlyPrice(entity.getTotalAmount());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getStores() != null && Hibernate.isInitialized(entity.getStores())) {
            dto.setStoreIds(entity.getStores().stream().map(Store::getId).collect(Collectors.toList()));
        } else {
            dto.setStoreIds(parseIds(entity.getSelectedStores()));
        }

        if (entity.getModules() != null && Hibernate.isInitialized(entity.getModules())) {
            dto.setModuleIds(entity.getModules().stream().map(Module::getId).collect(Collectors.toList()));
        } else {
            dto.setModuleIds(parseIds(entity.getSelectedModules()));
        }

        return dto;
    }

    public Request toEntity(RequestDto dto) {
        if (dto == null) return null;

        Request entity = new Request();
        entity.setRequestType(dto.getRequestType());
        entity.setStatus(dto.getStatus());
        entity.setPriority(dto.getPriority());
        entity.setRejectionReason(dto.getRejectionReason());
        entity.setCreatedBy(dto.getCreatedBy());
        entity.setBankName(dto.getBankName());
        entity.setBankEmail(dto.getBankEmail());
        entity.setLogoUrl(dto.getLogoUrl());
        entity.setCountry(dto.getCountry());
        entity.setWebsite(dto.getWebsite());
        entity.setContactName(dto.getContactName());
        entity.setContactEmail(dto.getContactEmail());
        entity.setContactPhone(dto.getContactPhone());
        entity.setContactImageUrl(dto.getContactImageUrl());
        entity.setDescription(dto.getDescription());
        entity.setBankDescription(dto.getBankDescription());
        entity.setEstablishmentYear(dto.getEstablishmentYear());
        entity.setMarketplaceSlug(dto.getMarketplaceSlug());
        entity.setMarketplaceDescription(dto.getMarketplaceDescription());
        entity.setPrimaryColor(dto.getPrimaryColor());
        entity.setSecondaryColor(dto.getSecondaryColor());
        entity.setBanniereUrl(dto.getBanniereUrl());
        entity.setSelectedStores(dto.getSelectedStores());
        entity.setSelectedModules(dto.getSelectedModules());
        entity.setTotalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : dto.getTotalMonthlyPrice());
        return entity;
    }

    private List<RequestStoreSelectionDto> toStoreSelectionDtos(List<RequestStoreSelection> stores) {
        if (stores == null) return List.of();
        return stores.stream()
                .map(store -> new RequestStoreSelectionDto(
                        store.getId(),
                        store.getStoreId(),
                        store.getStoreName(),
                        store.getStoreDescription(),
                        store.getStorePrice(),
                        toModuleSelectionDtos(store.getModules())
                ))
                .collect(Collectors.toList());
    }

    private List<RequestModuleSelectionDto> toModuleSelectionDtos(List<RequestModuleSelection> modules) {
        if (modules == null) return List.of();
        return modules.stream()
                .map(module -> new RequestModuleSelectionDto(
                        module.getId(),
                        module.getModuleId(),
                        module.getModuleName(),
                        module.getModuleDescription(),
                        module.getModulePrice(),
                        module.getParameters()
                ))
                .collect(Collectors.toList());
    }

    private List<Long> parseIds(String raw) {
        if (raw == null || raw.isBlank()) return List.of();

        List<Long> ids = new ArrayList<>();
        String[] parts = raw.replace("[", "").replace("]", "").split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    ids.add(Long.parseLong(trimmed));
                } catch (NumberFormatException ignored) {
                    // Ignore invalid legacy values.
                }
            }
        }
        return ids;
    }

    private void populateAdminContact(Request entity, RequestDto dto) {
        Long bankId = entity.getBank() != null ? entity.getBank().getId() : null;
        if (bankId == null) {
            dto.setAdminContactName(entity.getContactName());
            dto.setAdminContactEmail(entity.getContactEmail());
            dto.setAdminContactPhone(entity.getContactPhone());
            return;
        }

        List<User> bankUsers = userRepository.findByBank_IdOrderByCreatedAtAsc(bankId);
        User adminUser = bankUsers.stream()
                .filter(user -> user.getRole() == RoleEnum.ADMIN_BANK)
                .findFirst()
                .orElse(bankUsers.stream().findFirst().orElse(null));

        if (adminUser == null) {
            dto.setAdminContactName(entity.getContactName());
            dto.setAdminContactEmail(entity.getContactEmail());
            dto.setAdminContactPhone(entity.getContactPhone());
            return;
        }

        dto.setAdminContactName(adminUser.getFullName());
        dto.setAdminContactEmail(adminUser.getEmail());
        dto.setAdminContactPhone(adminUser.getPhone());
    }
}
