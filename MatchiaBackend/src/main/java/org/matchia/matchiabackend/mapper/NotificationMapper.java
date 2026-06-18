package org.matchia.matchiabackend.mapper;

import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationDto toDto(Notification entity) {
        if (entity == null) return null;

        return new NotificationDto(
                entity.getId(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getType(),
                entity.getStatus(),
                entity.getRelatedRequestId(),
                entity.getRelatedRequestId(),
                entity.getRecipientId(),
                entity.getCreatedAt(),
                entity.getReadAt()
        );
    }

    public Notification toEntity(NotificationDto dto) {
        if (dto == null) return null;

        Notification entity = new Notification();
        entity.setTitle(dto.getTitle());
        entity.setMessage(dto.getMessage());
        entity.setType(dto.getType());
        entity.setStatus(dto.getStatus());
        entity.setRelatedRequestId(dto.getRelatedRequestId() != null ? dto.getRelatedRequestId() : dto.getRequestId());
        entity.setRecipientId(dto.getRecipientId());
        entity.setReadAt(dto.getReadAt());
        return entity;
    }
}
