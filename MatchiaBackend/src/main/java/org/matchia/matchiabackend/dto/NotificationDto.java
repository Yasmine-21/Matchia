package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationTypeEnum;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private Long id;
    private String title;
    private String message;
    private NotificationTypeEnum type;
    private NotificationStatusEnum status;
    private Long relatedRequestId;
    private Long requestId;
    private Long recipientId;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
