package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.entity.Request;
import org.springframework.stereotype.Component;

@Component
public class RequestMapper {
    public RequestDto toDto(Request entity) {
        if (entity == null) return null;
        return new RequestDto(
            entity.getId(),
            entity.getBank() != null ? entity.getBank().getId() : null,
            entity.getRequestType(),
            entity.getStatus(),
            entity.getPriority(),
            entity.getCreatedBy(),
            entity.getCreatedAt()
        );
    }
    public Request toEntity(RequestDto dto) {
        if (dto == null) return null;
        Request entity = new Request();
        entity.setId(dto.getId());
        entity.setRequestType(dto.getRequestType());
        entity.setStatus(dto.getStatus());
        entity.setPriority(dto.getPriority());
        entity.setCreatedBy(dto.getCreatedBy());
        entity.setCreatedAt(dto.getCreatedAt());
        return entity;
    }
}
