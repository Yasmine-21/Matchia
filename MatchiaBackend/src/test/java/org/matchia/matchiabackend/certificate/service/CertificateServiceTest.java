package org.matchia.matchiabackend.certificate.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.entity.Certificate;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.dto.CertificateRequestDto;
import org.matchia.matchiabackend.dto.CertificateRevokeRequestDto;
import org.matchia.matchiabackend.entity.enums.CertificateEnvironmentEnum;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;
import org.matchia.matchiabackend.entity.enums.CertificateTypeEnum;
import org.matchia.matchiabackend.repository.*;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.NotificationService;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CertificateServiceTest {
    private CertificateRepository certificates;
    private CertificateActionHistoryRepository history;
    private BankRepository banks;
    private CertificateService service;

    @BeforeEach
    void setUp() {
        certificates = mock(CertificateRepository.class); history = mock(CertificateActionHistoryRepository.class); banks = mock(BankRepository.class);
        service = new CertificateService(certificates, history, banks, mock(MarketplaceRepository.class), mock(NotificationService.class), mock(AuditLogger.class));
        ReflectionTestUtils.setField(service, "defaultValidityDays", 365);
        ReflectionTestUtils.setField(service, "rotationThresholdDays", 30);
    }

    @Test
    void findsCertificatesAndRejectsMissingIdentifiers() {
        Certificate certificate = new Certificate(); certificate.setId(1L); certificate.setName("TLS"); certificate.setExpirationDate(LocalDate.now().plusDays(10));
        when(certificates.findAllByOrderByExpirationDateAsc()).thenReturn(List.of(certificate));
        when(certificates.findById(1L)).thenReturn(Optional.of(certificate));
        assertThat(service.findAll()).hasSize(1);
        assertThat(service.findById(1L).getName()).isEqualTo("TLS");
        assertThatThrownBy(() -> service.findById(null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refusesActivationOfRevokedOrExpiredCertificate() {
        Certificate revoked = new Certificate(); revoked.setStatus(CertificateStatusEnum.REVOKED);
        Certificate expired = new Certificate(); expired.setStatus(CertificateStatusEnum.EXPIRED);
        when(certificates.findById(1L)).thenReturn(Optional.of(revoked));
        when(certificates.findById(2L)).thenReturn(Optional.of(expired));
        assertThatThrownBy(() -> service.activate(1L)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.activate(2L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void expirationSweepMarksExpiredCertificatesAndSkipsUnmonitoredOnes() {
        Certificate expired = new Certificate(); expired.setId(1L); expired.setName("TLS"); expired.setStatus(CertificateStatusEnum.ACTIVE); expired.setExpirationDate(LocalDate.now().minusDays(1));
        Certificate revoked = new Certificate(); revoked.setStatus(CertificateStatusEnum.REVOKED); revoked.setExpirationDate(LocalDate.now().minusDays(1));
        when(certificates.findAllByOrderByExpirationDateAsc()).thenReturn(List.of(expired, revoked));
        when(certificates.save(any())).thenAnswer(i -> i.getArgument(0));
        service.runExpirationSweep();
        assertThat(expired.getStatus()).isEqualTo(CertificateStatusEnum.EXPIRED);
        verify(certificates).save(expired);
    }

    @Test
    void issuesImportsTestsRotatesAndRevokesBankCertificate() {
        Bank bank = new Bank(); bank.setId(7L); bank.setName("Banque Matchia");
        when(banks.findById(7L)).thenReturn(Optional.of(bank));
        when(certificates.save(any(Certificate.class))).thenAnswer(i -> {
            Certificate certificate = i.getArgument(0);
            if (certificate.getId() == null) certificate.setId(11L);
            return certificate;
        });
        CertificateRequestDto request = new CertificateRequestDto(" TLS ", CertificateTypeEnum.TLS_SERVER, "BANK", 7L, null,
                "payments", CertificateEnvironmentEnum.TEST, null, null, null, LocalDate.now(), null, true);

        var issued = service.issue(request);
        assertThat(issued.getStatus()).isEqualTo(CertificateStatusEnum.REQUESTED);
        assertThat(issued.getSerialNumber()).startsWith("SN-TLS-");
        var imported = service.importCertificate(request);
        assertThat(imported.getStatus()).isEqualTo(CertificateStatusEnum.ACTIVE);

        Certificate active = new Certificate(); active.setId(11L); active.setName("TLS"); active.setType(CertificateTypeEnum.TLS_SERVER);
        active.setEnvironment(CertificateEnvironmentEnum.TEST); active.setRelatedService("payments"); active.setBank(bank);
        active.setSerialNumber("serial"); active.setFingerprint("fingerprint"); active.setSecurePrivateKeyReference("secret");
        active.setStatus(CertificateStatusEnum.ACTIVE); active.setExpirationDate(LocalDate.now().plusDays(5));
        when(certificates.findById(11L)).thenReturn(Optional.of(active));
        assertThat(service.test(11L).isPassed()).isTrue();
        assertThat(service.rotate(11L).getStatus()).isEqualTo(CertificateStatusEnum.ROTATED);
        assertThat(service.revoke(11L, new CertificateRevokeRequestDto("compromis")).getStatus()).isEqualTo(CertificateStatusEnum.REVOKED);
        verify(history, atLeast(5)).save(any());
    }
}
