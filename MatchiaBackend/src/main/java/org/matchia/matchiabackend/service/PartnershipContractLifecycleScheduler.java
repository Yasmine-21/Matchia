package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartnershipContractLifecycleScheduler {
    private final PartnershipContractService contractService;

    @Scheduled(cron = "${dealer.contract.expiration-cron:0 30 2 * * *}")
    public void expireContracts() {
        contractService.expireContracts();
    }
}
