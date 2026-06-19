package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.matchia.matchiabackend.entity.enums.ContentStatusEnum;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContentDto {
    private Long id;
    private Long storeId;
    private String storeName;
    private String title;
    private String description;
    private String imageUrl;
    private ContentStatusEnum status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
