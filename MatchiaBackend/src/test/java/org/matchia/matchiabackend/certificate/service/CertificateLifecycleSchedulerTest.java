package org.matchia.matchiabackend.certificate.service;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;

class CertificateLifecycleSchedulerTest {
    @Test
    void runsSweepAndAbsorbsSchedulerFailures() {
        CertificateService service = mock(CertificateService.class);
        CertificateLifecycleScheduler scheduler = new CertificateLifecycleScheduler(service);
        scheduler.monitorCertificates();
        verify(service).runExpirationSweep();

        doThrow(new IllegalStateException("database unavailable")).when(service).runExpirationSweep();
        scheduler.monitorCertificates();
        verify(service, times(2)).runExpirationSweep();
    }
}
