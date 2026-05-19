package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.UserDto;
import org.matchia.matchiabackend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public UserDto toDto(User entity) {
        if (entity == null) return null;
        return new UserDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getFullName(),
            entity.getEmail(),
            entity.getPhone(),
            entity.getRole(),
            entity.getStatus(),
            entity.getPassword(),
            entity.getCreatedAt()
        );
    }
    public User toEntity(UserDto dto) {
        if (dto == null) return null;
        User entity = new User();
        entity.setId(dto.getId());
        entity.setFullName(dto.getFullName());
        entity.setEmail(dto.getEmail());
        entity.setPhone(dto.getPhone());
        entity.setRole(dto.getRole());
        entity.setStatus(dto.getStatus());
        entity.setPassword(dto.getPassword());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }
}
