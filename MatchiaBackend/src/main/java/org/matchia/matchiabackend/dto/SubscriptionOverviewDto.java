package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionOverviewDto {
    private List<SubscriptionDto> subscriptions = new ArrayList<>();
    private long activeCount;
    private long expiringCount;
    private long expiredCount;
    private long totalCount;
}
