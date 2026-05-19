package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.matchia.matchiabackend.entity.enums.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestDto {
    private Long id;
    private Long bankId;
    private RequestTypeEnum requestType;
    private RequestStatusEnum status;
    private String priority;
    private String createdBy;
    private LocalDateTime createdAt;
}
