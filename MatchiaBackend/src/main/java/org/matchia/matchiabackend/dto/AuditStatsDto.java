package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditStatsDto {
    private long core;
    private long security;
    private long dataConfig;
    private long billing;
    private long success;
    private long failure;
    private long total;
}
