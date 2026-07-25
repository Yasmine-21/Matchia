package org.matchia.matchiabackend.dto;

import lombok.Data;

@Data
public class CreateRenewalRequestDto {
    private Long bankId;
    private String createdBy;
}
