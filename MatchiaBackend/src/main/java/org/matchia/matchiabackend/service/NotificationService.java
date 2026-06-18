package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.NotificationDto;
import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.Payment;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationTypeEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.mapper.NotificationMapper;
import org.matchia.matchiabackend.repository.NotificationRepository;
import org.matchia.matchiabackend.repository.PaymentRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    private static final String DEFAULT_SAAS_ADMIN_EMAIL = "admin@matchia.com";

    @Transactional(readOnly = true)
    public List<NotificationDto> findAll() {
        return findSaasNotifications()
                .stream()
                .map(notificationMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> findUnread() {
        return findUnreadSaasNotifications()
                .stream()
                .map(notificationMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> findAllForRecipient(Long recipientId) {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipientId)
                .stream()
                .map(notificationMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread() {
        Long recipientId = resolveSaasRecipientId();
        long unreadCount = notificationRepository.countByRecipientIdIsNullAndStatus(NotificationStatusEnum.UNREAD);
        if (recipientId != null) {
            unreadCount += notificationRepository.countByRecipientIdAndStatus(recipientId, NotificationStatusEnum.UNREAD);
        }
        return unreadCount;
    }

    @Transactional(readOnly = true)
    public long countUnreadForRecipient(Long recipientId) {
        return notificationRepository.countByRecipientIdAndStatus(recipientId, NotificationStatusEnum.UNREAD);
    }

    @Transactional
    public NotificationDto markAsRead(Long id) {
        Notification notification = findOrThrow(id, resolveSaasRecipientId());
        if (notification.getStatus() == NotificationStatusEnum.UNREAD) {
            notification.setStatus(NotificationStatusEnum.READ);
            notification.setReadAt(LocalDateTime.now());
        }
        return notificationMapper.toDto(notificationRepository.save(notification));
    }

    @Transactional
    public NotificationDto markAsReadForRecipient(Long id, Long recipientId) {
        Notification notification = findOrThrow(id, recipientId);
        if (notification.getStatus() == NotificationStatusEnum.UNREAD) {
            notification.setStatus(NotificationStatusEnum.READ);
            notification.setReadAt(LocalDateTime.now());
        }
        return notificationMapper.toDto(notificationRepository.save(notification));
    }

    @Transactional
    public List<NotificationDto> markAllAsRead() {
        List<Notification> unreadNotifications = findUnreadSaasNotifications();
        LocalDateTime now = LocalDateTime.now();
        unreadNotifications.forEach(notification -> {
            notification.setStatus(NotificationStatusEnum.READ);
            notification.setReadAt(now);
        });
        notificationRepository.saveAll(unreadNotifications);
        return findAll();
    }

    @Transactional
    public List<NotificationDto> markAllAsReadForRecipient(Long recipientId) {
        List<Notification> unreadNotifications = notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(recipientId, NotificationStatusEnum.UNREAD);
        LocalDateTime now = LocalDateTime.now();
        unreadNotifications.forEach(notification -> {
            notification.setStatus(NotificationStatusEnum.READ);
            notification.setReadAt(now);
        });
        notificationRepository.saveAll(unreadNotifications);
        return findAllForRecipient(recipientId);
    }

    @Transactional
    public void deleteById(Long id) {
        Notification notification = findOrThrow(id, resolveSaasRecipientId());
        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteByIdForRecipient(Long id, Long recipientId) {
        if (notificationRepository.findByIdAndRecipientId(id, recipientId).isEmpty()) {
            throw new NoSuchElementException("Notification introuvable.");
        }
        notificationRepository.deleteById(id);
    }

    @Transactional
    public Notification createNotification(
            String title,
            String message,
            NotificationTypeEnum type,
            NotificationStatusEnum status,
            Long relatedRequestId,
            Long recipientId
    ) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setStatus(status);
        notification.setRelatedRequestId(relatedRequestId);
        notification.setRecipientId(recipientId);
        return notificationRepository.save(notification);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification createPaymentSuccessNotification(Request request) {
        if (request == null || request.getId() == null) {
            log.warn("Demande incomplete: impossible de creer la notification de paiement.");
            return null;
        }

        Long recipientId = resolveSaasRecipientId();
        if (recipientId != null) {
            if (notificationRepository.existsByTypeAndRelatedRequestIdAndRecipientId(
                    NotificationTypeEnum.PAYMENT_SUCCESS,
                    request.getId(),
                    recipientId
            )) {
                return notificationRepository.findFirstByTypeAndRelatedRequestIdAndRecipientIdOrderByCreatedAtDesc(
                        NotificationTypeEnum.PAYMENT_SUCCESS,
                        request.getId(),
                        recipientId
                ).orElse(null);
            }
        } else if (notificationRepository.existsByTypeAndRelatedRequestIdAndRecipientIdIsNull(
                NotificationTypeEnum.PAYMENT_SUCCESS,
                request.getId()
        )) {
            return notificationRepository.findFirstByTypeAndRelatedRequestIdAndRecipientIdIsNullOrderByCreatedAtDesc(
                    NotificationTypeEnum.PAYMENT_SUCCESS,
                    request.getId()
            ).orElse(null);
        }

        String bankName = hasText(request.getBankName()) ? request.getBankName().trim() : "La banque";
        String marketplaceName = hasText(request.getMarketplaceSlug())
                ? request.getMarketplaceSlug().trim()
                : "la marketplace";

        return createNotification(
                "Paiement d'abonnement reçu",
                "La banque " + bankName + " a effectué avec succès le paiement de l'abonnement de la marketplace " + marketplaceName + ".",
                NotificationTypeEnum.PAYMENT_SUCCESS,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                recipientId
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification createPaymentSuccessNotification(Payment payment) {
        if (payment == null || payment.getId() == null) {
            log.warn("Paiement incomplet: impossible de creer la notification de paiement.");
            return null;
        }
        return createPaymentSuccessNotification(payment.getId());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification createPaymentSuccessNotification(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null || payment.getRequest() == null) {
            log.warn("Paiement {} introuvable ou incomplet: impossible de creer la notification de paiement.", paymentId);
            return null;
        }

        Request request = payment.getRequest();
        Long recipientId = resolveSaasRecipientId();
        if (recipientId != null) {
            if (notificationRepository.existsByTypeAndRelatedRequestIdAndRecipientId(
                    NotificationTypeEnum.PAYMENT_SUCCESS,
                    request.getId(),
                    recipientId
            )) {
                return notificationRepository.findFirstByTypeAndRelatedRequestIdAndRecipientIdOrderByCreatedAtDesc(
                        NotificationTypeEnum.PAYMENT_SUCCESS,
                        request.getId(),
                        recipientId
                ).orElse(null);
            }
        } else if (notificationRepository.existsByTypeAndRelatedRequestIdAndRecipientIdIsNull(
                NotificationTypeEnum.PAYMENT_SUCCESS,
                request.getId()
        )) {
            return notificationRepository.findFirstByTypeAndRelatedRequestIdAndRecipientIdIsNullOrderByCreatedAtDesc(
                    NotificationTypeEnum.PAYMENT_SUCCESS,
                    request.getId()
            ).orElse(null);
        }

        String bankName = hasText(payment.getBankName())
                ? payment.getBankName().trim()
                : (request.getBankName() != null && !request.getBankName().isBlank()
                    ? request.getBankName().trim()
                    : "La banque");
        String marketplaceName = hasText(request.getMarketplaceSlug())
                ? request.getMarketplaceSlug().trim()
                : "la marketplace";

        return createNotification(
                "Paiement d'abonnement reçu",
                "La banque " + bankName + " a effectué avec succès le paiement de l'abonnement de la marketplace " + marketplaceName + ".",
                NotificationTypeEnum.PAYMENT_SUCCESS,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                recipientId
        );
    }

    @Transactional
    public Notification createRequestCreatedNotification(Request request) {
        String requestType = request.getRequestType() != null ? request.getRequestType().name().toLowerCase() : "request";
        return createNotification(
                buildCreatedTitle(requestType),
                buildRequestMessage(request, requestType),
                NotificationTypeEnum.INFO,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                resolveSaasRecipientId()
        );
    }

    @Transactional
    public Notification createRequestApprovedNotification(Request request) {
        return createNotification(
                buildDecisionTitle(request, "approuvée"),
                buildDecisionMessage(request, "approuvée", null),
                NotificationTypeEnum.SUCCESS,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                resolveSaasRecipientId()
        );
    }

    @Transactional
    public Notification createRequestRejectedNotification(Request request, String rejectionReason) {
        return createNotification(
                buildDecisionTitle(request, "rejetée"),
                buildDecisionMessage(request, "rejetée", rejectionReason),
                NotificationTypeEnum.WARNING,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                resolveSaasRecipientId()
        );
    }

    @Transactional
    public Notification createBankRequestRejectedNotification(Request request, String rejectionReason) {
        Long recipientId = resolveRecipientId(request);
        if (recipientId == null) {
            log.warn("Impossible de creer la notification banque: banque introuvable pour la demande {}.", request.getId());
            return null;
        }

        String requestType = request.getRequestType() != null ? request.getRequestType().name().toLowerCase() : "request";
        return createNotification(
                buildBankRejectedTitle(requestType),
                buildBankRejectedMessage(request, requestType, rejectionReason),
                NotificationTypeEnum.WARNING,
                NotificationStatusEnum.UNREAD,
                request.getId(),
                recipientId
        );
    }

    private String buildCreatedTitle(String requestType) {
        return switch (requestType) {
            case "join" -> "Nouvelle demande d'inscription";
            case "store" -> "Nouvelle demande de store";
            case "module" -> "Nouvelle demande de module";
            default -> "Nouvelle demande reçue";
        };
    }

    private String buildDecisionTitle(Request request, String decisionLabel) {
        String requestType = request.getRequestType() != null ? request.getRequestType().name().toLowerCase() : "request";
        return switch (requestType) {
            case "join" -> "Demande d'inscription " + decisionLabel;
            case "store" -> "Demande de store " + decisionLabel;
            case "module" -> "Demande de module " + decisionLabel;
            default -> "Demande " + decisionLabel;
        };
    }

    private String buildRequestMessage(Request request, String requestType) {
        String bankName = hasText(request.getBankName()) ? request.getBankName().trim() : "La banque";
        return switch (requestType) {
            case "join" -> bankName + " a envoyé une demande de rejoindre Matchia.";
            case "store" -> bankName + " a envoyé une demande de nouveau store.";
            case "module" -> bankName + " a envoyé une demande de nouveau module.";
            default -> bankName + " a envoyé une nouvelle demande.";
        };
    }

    private String buildDecisionMessage(Request request, String decisionLabel, String rejectionReason) {
        String bankName = hasText(request.getBankName()) ? request.getBankName().trim() : "La banque";
        String requestType = request.getRequestType() != null ? request.getRequestType().name().toLowerCase() : "request";
        String message = switch (requestType) {
            case "join" -> "La demande d'inscription de " + bankName + " a été " + decisionLabel + ".";
            case "store" -> "La demande de nouveau store de " + bankName + " a été " + decisionLabel + ".";
            case "module" -> "La demande de nouveau module de " + bankName + " a été " + decisionLabel + ".";
            default -> "La demande de " + bankName + " a été " + decisionLabel + ".";
        };
        return appendReason(message, rejectionReason);
    }

    private String buildBankRejectedTitle(String requestType) {
        return switch (requestType) {
            case "store" -> "Demande de store rejetée";
            case "module" -> "Demande de module rejetée";
            default -> "Demande rejetée";
        };
    }

    private String buildBankRejectedMessage(Request request, String requestType, String rejectionReason) {
        String message = switch (requestType) {
            case "store" -> "Votre demande pour un nouveau store a été rejetée.";
            case "module" -> "Votre demande pour un nouveau module a été rejetée.";
            default -> "Votre demande a été rejetée.";
        };
        return appendReason(message, rejectionReason);
    }

    private String appendReason(String message, String rejectionReason) {
        if (!hasText(rejectionReason)) {
            return message;
        }
        return message + " Motif: " + rejectionReason.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Long resolveRecipientId(Request request) {
        return request != null && request.getBank() != null ? request.getBank().getId() : null;
    }

    private Long resolveSaasRecipientId() {
        Optional<User> saasAdmin = userRepository.findByRoleOrderByCreatedAtAsc(RoleEnum.ADMIN_SAAS)
                .stream()
                .findFirst();
        if (saasAdmin.isPresent()) {
            return saasAdmin.get().getId();
        }

        return userRepository.findByEmail(DEFAULT_SAAS_ADMIN_EMAIL)
                .map(User::getId)
                .orElseGet(() -> {
                    log.warn("Aucun admin SaaS trouve pour rattacher les notifications SaaS.");
                    return null;
                });
    }

    private List<Notification> findSaasNotifications() {
        Long recipientId = resolveSaasRecipientId();
        List<Notification> notifications = new ArrayList<>();
        if (recipientId != null) {
            notifications.addAll(notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipientId));
        }
        notifications.addAll(notificationRepository.findAllByRecipientIdIsNullOrderByCreatedAtDesc());
        return sortAndDeduplicate(notifications);
    }

    private List<Notification> findUnreadSaasNotifications() {
        Long recipientId = resolveSaasRecipientId();
        List<Notification> notifications = new ArrayList<>();
        if (recipientId != null) {
            notifications.addAll(notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(recipientId, NotificationStatusEnum.UNREAD));
        }
        notifications.addAll(notificationRepository.findByRecipientIdIsNullAndStatusOrderByCreatedAtDesc(NotificationStatusEnum.UNREAD));
        return sortAndDeduplicate(notifications);
    }

    private List<Notification> sortAndDeduplicate(List<Notification> notifications) {
        Map<Long, Notification> deduplicated = new LinkedHashMap<>();
        for (Notification notification : notifications) {
            if (notification != null && notification.getId() != null) {
                deduplicated.putIfAbsent(notification.getId(), notification);
            }
        }

        return deduplicated.values().stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Notification::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
    }

    private Notification findOrThrow(Long id, Long recipientId) {
        if (recipientId == null) {
            return notificationRepository.findByIdAndRecipientIdIsNull(id)
                    .orElseThrow(() -> new NoSuchElementException("Notification introuvable."));
        }
        return notificationRepository.findByIdAndRecipientId(id, recipientId)
                .or(() -> notificationRepository.findByIdAndRecipientIdIsNull(id))
                .orElseThrow(() -> new NoSuchElementException("Notification introuvable."));
    }
}
