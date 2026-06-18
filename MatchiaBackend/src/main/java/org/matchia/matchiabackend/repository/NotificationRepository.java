package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationTypeEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByRecipientIdIsNullOrderByCreatedAtDesc();

    List<Notification> findAllByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<Notification> findByRecipientIdIsNullAndStatusOrderByCreatedAtDesc(NotificationStatusEnum status);

    List<Notification> findByRecipientIdAndStatusOrderByCreatedAtDesc(Long recipientId, NotificationStatusEnum status);

    long countByRecipientIdIsNullAndStatus(NotificationStatusEnum status);

    long countByRecipientIdAndStatus(Long recipientId, NotificationStatusEnum status);

    java.util.Optional<Notification> findByIdAndRecipientIdIsNull(Long id);

    java.util.Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    boolean existsByTypeAndRelatedRequestIdAndRecipientId(NotificationTypeEnum type, Long relatedRequestId, Long recipientId);

    java.util.Optional<Notification> findFirstByTypeAndRelatedRequestIdAndRecipientIdOrderByCreatedAtDesc(
            NotificationTypeEnum type,
            Long relatedRequestId,
            Long recipientId
    );

    boolean existsByTypeAndRelatedRequestIdAndRecipientIdIsNull(NotificationTypeEnum type, Long relatedRequestId);

    java.util.Optional<Notification> findFirstByTypeAndRelatedRequestIdAndRecipientIdIsNullOrderByCreatedAtDesc(
            NotificationTypeEnum type,
            Long relatedRequestId
    );
}
