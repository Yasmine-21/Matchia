package org.matchia.matchiabackend.certificate.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CertificateLifecycleScheduler {

    private final CertificateService certificateService;

    @Scheduled(cron = "${certificate.monitor-cron:0 0 2 * * *}")
    public void monitorCertificates() {
        try {
            certificateService.runExpirationSweep();
        } catch (Exception error) {
            log.error("Certificate lifecycle monitoring failed: {}", error.getMessage(), error);
        }
    }
}
