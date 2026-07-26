package org.matchia.matchiabackend.certificate.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.CertificateDto;
import org.matchia.matchiabackend.dto.CertificateHistoryDto;
import org.matchia.matchiabackend.dto.CertificateRequestDto;
import org.matchia.matchiabackend.dto.CertificateRevokeRequestDto;
import org.matchia.matchiabackend.dto.CertificateTestResponseDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Certificate;
import org.matchia.matchiabackend.entity.CertificateActionHistory;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.CertificateEnvironmentEnum;
import org.matchia.matchiabackend.entity.enums.CertificateStatusEnum;
import org.matchia.matchiabackend.entity.enums.CertificateTypeEnum;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationTypeEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.CertificateActionHistoryRepository;
import org.matchia.matchiabackend.repository.CertificateRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.service.AuditLogger;
import org.matchia.matchiabackend.service.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateService {

    private static final Collection<CertificateStatusEnum> MONITORED_STATUSES = List.of(
            CertificateStatusEnum.REQUESTED,
            CertificateStatusEnum.ACTIVE,
            CertificateStatusEnum.EXPIRING_SOON,
            CertificateStatusEnum.ROTATING,
            CertificateStatusEnum.ROTATED,
            CertificateStatusEnum.FAILED
    );

    private final CertificateRepository certificateRepository;
    private final CertificateActionHistoryRepository certificateHistoryRepository;
    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final NotificationService notificationService;
    private final AuditLogger auditLogger;

    @Value("${certificate.default-validity-days:365}")
    private int defaultValidityDays;

    @Value("${certificate.rotation-threshold-days:30}")
    private int rotationThresholdDays;

    @Transactional(readOnly = true)
    public List<CertificateDto> findAll() {
        return certificateRepository.findAllByOrderByExpirationDateAsc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CertificateDto findById(Long id) {
        return toDto(findCertificate(id));
    }

    @Transactional(readOnly = true)
    public List<CertificateHistoryDto> history(Long certificateId) {
        Certificate certificate = findCertificate(certificateId);
        return certificateHistoryRepository.findByCertificate_IdOrderByPerformedAtDesc(certificate.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    @Transactional
    public CertificateDto issue(CertificateRequestDto request) {
        Certificate certificate = buildCertificate(request, CertificateStatusEnum.REQUESTED);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "ISSUED", "Certificate issued and waiting activation.", saved.getStatus());
        notifySaas("Certificat demande", buildNotificationMessage(saved, "a ete demande et attend activation."), NotificationTypeEnum.INFO);
        audit(saved, "certificate.issued", AuditStatusEnum.success);
        return toDto(saved);
    }

    @Transactional
    public CertificateDto importCertificate(CertificateRequestDto request) {
        Certificate certificate = buildCertificate(request, CertificateStatusEnum.ACTIVE);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "IMPORTED", "Certificate imported and activated.", saved.getStatus());
        notifySaas("Certificat importe", buildNotificationMessage(saved, "a ete importe et active."), NotificationTypeEnum.SUCCESS);
        audit(saved, "certificate.imported", AuditStatusEnum.success);
        return toDto(saved);
    }

    @Transactional
    public CertificateDto activate(Long id) {
        Certificate certificate = findCertificate(id);
        if (certificate.getStatus() == CertificateStatusEnum.REVOKED) {
            throw new IllegalStateException("Impossible d'activer un certificat revoque.");
        }
        if (certificate.getStatus() == CertificateStatusEnum.EXPIRED) {
            throw new IllegalStateException("Impossible d'activer un certificat expire.");
        }
        certificate.setStatus(CertificateStatusEnum.ACTIVE);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "ACTIVATED", "Certificate activated.", saved.getStatus());
        notifySaas("Certificat active", buildNotificationMessage(saved, "a ete active."), NotificationTypeEnum.SUCCESS);
        audit(saved, "certificate.activated", AuditStatusEnum.success);
        return toDto(saved);
    }

    @Transactional
    public CertificateTestResponseDto test(Long id) {
        Certificate certificate = findCertificate(id);
        ValidationOutcome outcome = validateCertificate(certificate);
        if (outcome.passed()) {
            appendHistory(certificate, "TESTED", outcome.message(), certificate.getStatus());
            audit(certificate, "certificate.tested", AuditStatusEnum.success);
        } else {
            if (outcome.expired()) {
                certificate.setStatus(CertificateStatusEnum.EXPIRED);
            } else {
                certificate.setStatus(CertificateStatusEnum.FAILED);
            }
            certificateRepository.save(certificate);
            appendHistory(certificate, "TEST_FAILED", outcome.message(), certificate.getStatus());
            audit(certificate, "certificate.test_failed", AuditStatusEnum.failure);
        }
        return new CertificateTestResponseDto(
                certificate.getId(),
                outcome.passed(),
                outcome.message(),
                LocalDateTime.now()
        );
    }

    @Transactional
    public CertificateDto rotate(Long id) {
        Certificate certificate = findCertificate(id);
        if (certificate.getStatus() == CertificateStatusEnum.REVOKED) {
            throw new IllegalStateException("Impossible de faire tourner un certificat revoque.");
        }
        certificate.setStatus(CertificateStatusEnum.ROTATING);
        certificateRepository.save(certificate);
        appendHistory(certificate, "ROTATING", "Certificate rotation started.", certificate.getStatus());

        certificate.setSerialNumber(generateSerialNumber(certificate.getName()));
        certificate.setFingerprint(generateFingerprint(certificate));
        certificate.setSecurePrivateKeyReference(generateSecureReference(certificate));
        certificate.setIssueDate(LocalDate.now());
        certificate.setExpirationDate(LocalDate.now().plusDays(defaultValidityDays));
        certificate.setStatus(CertificateStatusEnum.ROTATED);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "ROTATED", "Certificate rotation completed.", saved.getStatus());
        notifySaas("Certificat tourne", buildNotificationMessage(saved, "a ete tourne avant expiration."), NotificationTypeEnum.WARNING);
        audit(saved, "certificate.rotated", AuditStatusEnum.success);
        return toDto(saved);
    }

    @Transactional
    public CertificateDto revoke(Long id, CertificateRevokeRequestDto request) {
        Certificate certificate = findCertificate(id);
        certificate.setStatus(CertificateStatusEnum.REVOKED);
        certificate.setRevocationReason(request != null ? request.getReason().trim() : null);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "REVOKED", saved.getRevocationReason(), saved.getStatus());
        notifySaas("Certificat revoque", buildNotificationMessage(saved, "a ete revoque."), NotificationTypeEnum.WARNING);
        audit(saved, "certificate.revoked", AuditStatusEnum.success);
        return toDto(saved);
    }

    @Transactional
    public void runExpirationSweep() {
        LocalDate today = LocalDate.now();
        for (Certificate certificate : certificateRepository.findAllByOrderByExpirationDateAsc()) {
            if (certificate.getStatus() == null || !MONITORED_STATUSES.contains(certificate.getStatus())) {
                continue;
            }
            if (certificate.getExpirationDate() == null) {
                continue;
            }

            long remainingDays = ChronoUnit.DAYS.between(today, certificate.getExpirationDate());
            if (remainingDays < 0 && certificate.getStatus() != CertificateStatusEnum.EXPIRED) {
                certificate.setStatus(CertificateStatusEnum.EXPIRED);
                certificateRepository.save(certificate);
                appendHistory(certificate, "EXPIRED", "Certificate expired automatically.", certificate.getStatus());
                notifySaas("Certificat expire", buildNotificationMessage(certificate, "a expire."), NotificationTypeEnum.ERROR);
                audit(certificate, "certificate.expired", AuditStatusEnum.success);
                continue;
            }

            if (remainingDays <= rotationThresholdDays && remainingDays >= 0) {
                if (certificate.isAutomaticRotationEnabled()) {
                    rotateForScheduler(certificate);
                } else if (certificate.getStatus() != CertificateStatusEnum.EXPIRING_SOON) {
                    certificate.setStatus(CertificateStatusEnum.EXPIRING_SOON);
                    certificateRepository.save(certificate);
                    appendHistory(certificate, "EXPIRING_SOON", "Certificate is close to expiration.", certificate.getStatus());
                    notifySaas("Certificat bientot expirant", buildNotificationMessage(certificate, "expire bientot."), NotificationTypeEnum.WARNING);
                    audit(certificate, "certificate.expiring_soon", AuditStatusEnum.success);
                }
            }
        }
    }

    private void rotateForScheduler(Certificate certificate) {
        if (certificate.getStatus() == CertificateStatusEnum.ROTATED) {
            return;
        }
        certificate.setStatus(CertificateStatusEnum.ROTATING);
        certificateRepository.save(certificate);
        appendHistory(certificate, "ROTATING", "Automatic rotation started.", certificate.getStatus());

        certificate.setSerialNumber(generateSerialNumber(certificate.getName()));
        certificate.setFingerprint(generateFingerprint(certificate));
        certificate.setSecurePrivateKeyReference(generateSecureReference(certificate));
        certificate.setIssueDate(LocalDate.now());
        certificate.setExpirationDate(LocalDate.now().plusDays(defaultValidityDays));
        certificate.setStatus(CertificateStatusEnum.ROTATED);
        Certificate saved = certificateRepository.save(certificate);
        appendHistory(saved, "ROTATED", "Automatic rotation completed.", saved.getStatus());
        notifySaas("Certificat tourne automatiquement", buildNotificationMessage(saved, "a ete tourne automatiquement."), NotificationTypeEnum.WARNING);
        audit(saved, "certificate.auto_rotated", AuditStatusEnum.success);
    }

    private Certificate buildCertificate(CertificateRequestDto request, CertificateStatusEnum initialStatus) {
        validateRequest(request);

        Certificate certificate = new Certificate();
        certificate.setName(request.getName().trim());
        certificate.setType(request.getType());
        certificate.setRelatedService(request.getRelatedService().trim());
        certificate.setEnvironment(request.getEnvironment());
        certificate.setIssuer(hasText(request.getIssuer()) ? request.getIssuer().trim() : "Matchia Trust Center");
        certificate.setIssueDate(request.getIssueDate() != null ? request.getIssueDate() : LocalDate.now());
        certificate.setExpirationDate(resolveExpirationDate(request, certificate.getIssueDate()));
        certificate.setStatus(initialStatus);
        certificate.setAutomaticRotationEnabled(Boolean.TRUE.equals(request.getAutomaticRotationEnabled()));
        certificate.setSerialNumber(hasText(request.getSerialNumber())
                ? request.getSerialNumber().trim()
                : generateSerialNumber(request.getName()));
        certificate.setFingerprint(hasText(request.getFingerprint())
                ? request.getFingerprint().trim()
                : generateFingerprint(certificate));
        certificate.setSecurePrivateKeyReference(generateSecureReference(certificate));
        applyTarget(request, certificate);
        return certificate;
    }

    private void applyTarget(CertificateRequestDto request, Certificate certificate) {
        String targetType = normalize(request.getTargetType());
        if ("MARKETPLACE".equals(targetType) || (request.getMarketplaceId() != null && request.getBankId() == null)) {
            if (request.getMarketplaceId() == null) {
                throw new IllegalArgumentException("Une marketplace doit etre selectionnee.");
            }
            Marketplace marketplace = marketplaceRepository.findById(request.getMarketplaceId())
                    .orElseThrow(() -> new NoSuchElementException("Marketplace introuvable."));
            certificate.setMarketplace(marketplace);
            certificate.setBank(null);
            return;
        }

        if ("BANK".equals(targetType) || request.getBankId() != null) {
            if (request.getBankId() == null) {
                throw new IllegalArgumentException("Une banque doit etre selectionnee.");
            }
            Bank bank = bankRepository.findById(request.getBankId())
                    .orElseThrow(() -> new NoSuchElementException("Banque introuvable."));
            certificate.setBank(bank);
            certificate.setMarketplace(null);
            return;
        }

        throw new IllegalArgumentException("Une banque ou une marketplace doit etre fournie.");
    }

    private Certificate findCertificate(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("certificateId is required.");
        }
        return certificateRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Certificat introuvable : " + id));
    }

    private void validateRequest(CertificateRequestDto request) {
        if (request == null) {
            throw new IllegalArgumentException("La requete certificat est obligatoire.");
        }
        if (!hasText(request.getName())) {
            throw new IllegalArgumentException("Le nom du certificat est obligatoire.");
        }
        if (request.getType() == null) {
            throw new IllegalArgumentException("Le type de certificat est obligatoire.");
        }
        if (request.getEnvironment() == null) {
            throw new IllegalArgumentException("L'environnement est obligatoire.");
        }
        if (!hasText(request.getRelatedService())) {
            throw new IllegalArgumentException("Le service associe est obligatoire.");
        }
        if (request.getBankId() == null && request.getMarketplaceId() == null) {
            throw new IllegalArgumentException("Une banque ou une marketplace doit etre selectionnee.");
        }
        String targetType = normalize(request.getTargetType());
        if ("BANK".equals(targetType) && request.getBankId() == null) {
            throw new IllegalArgumentException("Une banque doit etre selectionnee.");
        }
        if ("MARKETPLACE".equals(targetType) && request.getMarketplaceId() == null) {
            throw new IllegalArgumentException("Une marketplace doit etre selectionnee.");
        }
        if (request.getIssueDate() != null && request.getExpirationDate() != null
                && request.getExpirationDate().isBefore(request.getIssueDate())) {
            throw new IllegalArgumentException("La date d'expiration doit etre posterieure a la date d'emission.");
        }
    }

    private LocalDate resolveExpirationDate(CertificateRequestDto request, LocalDate issueDate) {
        if (request.getExpirationDate() != null) {
            return request.getExpirationDate();
        }
        return issueDate.plusDays(defaultValidityDays);
    }

    private CertificateDto toDto(Certificate certificate) {
        if (certificate == null) {
            return null;
        }
        return new CertificateDto(
                certificate.getId(),
                certificate.getName(),
                certificate.getType(),
                certificate.getBank() != null ? certificate.getBank().getId() : null,
                certificate.getBank() != null ? certificate.getBank().getName() : null,
                certificate.getMarketplace() != null ? certificate.getMarketplace().getId() : null,
                certificate.getMarketplace() != null
                        ? (certificate.getMarketplace().getBank() != null ? certificate.getMarketplace().getBank().getName() : "Marketplace")
                        : null,
                certificate.getRelatedService(),
                certificate.getEnvironment(),
                certificate.getSerialNumber(),
                certificate.getFingerprint(),
                certificate.getIssuer(),
                certificate.getIssueDate(),
                certificate.getExpirationDate(),
                certificate.getExpirationDate() != null
                        ? Math.max(ChronoUnit.DAYS.between(LocalDate.now(), certificate.getExpirationDate()), 0)
                        : null,
                certificate.getStatus(),
                certificate.getRevocationReason(),
                certificate.isAutomaticRotationEnabled(),
                certificate.getCreatedAt(),
                certificate.getUpdatedAt()
        );
    }

    private CertificateHistoryDto toHistoryDto(CertificateActionHistory history) {
        return new CertificateHistoryDto(
                history.getId(),
                history.getCertificate() != null ? history.getCertificate().getId() : null,
                history.getCertificate() != null ? history.getCertificate().getName() : null,
                history.getAction(),
                history.getDetails(),
                history.getStatusAfterAction(),
                history.getPerformedBy(),
                history.getPerformedAt()
        );
    }

    private void appendHistory(Certificate certificate, String action, String details, CertificateStatusEnum statusAfterAction) {
        CertificateActionHistory history = new CertificateActionHistory();
        history.setCertificate(certificate);
        history.setAction(action);
        history.setDetails(details);
        history.setStatusAfterAction(statusAfterAction);
        history.setPerformedBy(currentActor());
        certificateHistoryRepository.save(history);
    }

    private ValidationOutcome validateCertificate(Certificate certificate) {
        if (certificate.getStatus() == CertificateStatusEnum.REVOKED) {
            return new ValidationOutcome(false, false, "Le certificat est revoque.");
        }
        if (certificate.getStatus() == CertificateStatusEnum.EXPIRED
                || (certificate.getExpirationDate() != null && certificate.getExpirationDate().isBefore(LocalDate.now()))) {
            return new ValidationOutcome(false, true, "Le certificat est expire.");
        }
        if (!hasText(certificate.getName())
                || !hasText(certificate.getRelatedService())
                || certificate.getType() == null
                || certificate.getEnvironment() == null
                || certificate.getSerialNumber() == null
                || certificate.getFingerprint() == null
                || certificate.getSecurePrivateKeyReference() == null
                || (certificate.getBank() == null && certificate.getMarketplace() == null)) {
            return new ValidationOutcome(false, false, "Le certificat est incomplet ou invalide.");
        }
        return new ValidationOutcome(true, false, "Le certificat est valide pour l'integration demandee.");
    }

    private String buildNotificationMessage(Certificate certificate, String suffix) {
        String scope = certificate.getBank() != null
                ? certificate.getBank().getName()
                : certificate.getMarketplace() != null && certificate.getMarketplace().getBank() != null
                ? certificate.getMarketplace().getBank().getName()
                : certificate.getRelatedService();
        return "Le certificat " + certificate.getName() + " pour " + scope + " " + suffix;
    }

    private void notifySaas(String title, String message, NotificationTypeEnum type) {
        try {
            notificationService.createNotification(
                    title,
                    message,
                    type,
                    NotificationStatusEnum.UNREAD,
                    null,
                    null
            );
        } catch (Exception error) {
            log.warn("Notification certificat ignoree: {}", error.getMessage());
        }
    }

    private void audit(Certificate certificate, String action, AuditStatusEnum status) {
        try {
            org.matchia.matchiabackend.dto.AuditLogRequest request = new org.matchia.matchiabackend.dto.AuditLogRequest();
            request.setTenantId("saas");
            request.setAction(action);
            request.setCategory(AuditCategoryEnum.security);
            request.setResourceType("certificate");
            request.setResourceId(certificate != null && certificate.getId() != null ? String.valueOf(certificate.getId()) : null);
            request.setStatus(status);
            request.setBankId(certificate != null && certificate.getBank() != null && certificate.getBank().getId() != null
                    ? String.valueOf(certificate.getBank().getId()) : null);
            request.setMarketplaceId(certificate != null && certificate.getMarketplace() != null && certificate.getMarketplace().getId() != null
                    ? String.valueOf(certificate.getMarketplace().getId()) : null);
            request.setSource("CERTIFICATE_MANAGEMENT");
            request.setActorEmail(currentActor());
            request.setActorName(currentActor());
            request.setActorId(currentActor());
            request.setActorRole(currentRole());
            auditLogger.logAsync(request);
        } catch (Exception error) {
            log.warn("Audit certificat ignore: {}", error.getMessage());
        }
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "system";
        }
        return authentication.getName();
    }

    private String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return "SYSTEM";
        }
        return authentication.getAuthorities().stream()
                .findFirst()
                .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
                .orElse("SYSTEM");
    }

    private String generateSerialNumber(String seed) {
        String value = hasText(seed) ? seed.trim() : "CERT";
        return ("SN-" + value + "-" + UUID.randomUUID().toString().substring(0, 8))
                .toUpperCase(Locale.ROOT);
    }

    private String generateFingerprint(Certificate certificate) {
        String seed = String.join("|",
                safeText(certificate.getName()),
                safeText(certificate.getRelatedService()),
                certificate.getType() != null ? certificate.getType().name() : "",
                certificate.getEnvironment() != null ? certificate.getEnvironment().name() : "",
                safeText(certificate.getSerialNumber()),
                UUID.randomUUID().toString());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(seed.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString().toUpperCase(Locale.ROOT);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Impossible de generer l'empreinte du certificat.", exception);
        }
    }

    private String generateSecureReference(Certificate certificate) {
        String prefix = certificate != null && certificate.getType() != null
                ? certificate.getType().name().toLowerCase(Locale.ROOT)
                : "certificate";
        return "secret://matchia/" + prefix + "/" + UUID.randomUUID();
    }

    private String safeText(String value) {
        return hasText(value) ? value.trim() : "";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalize(String value) {
        return hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : null;
    }

    private record ValidationOutcome(boolean passed, boolean expired, String message) {
    }
}
