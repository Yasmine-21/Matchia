package org.matchia.matchiabackend.repository;

import org.matchia.matchiabackend.entity.Notification;
import org.matchia.matchiabackend.entity.enums.NotificationStatusEnum;
import org.matchia.matchiabackend.entity.enums.NotificationRecipientScope;
import org.matchia.matchiabackend.entity.enums.NotificationTypeEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop10ByOrderByCreatedAtDesc();

    List<Notification> findAllByRecipientIdIsNullOrderByCreatedAtDesc();

    List<Notification> findAllByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<Notification> findByRecipientIdIsNullAndStatusOrderByCreatedAtDesc(NotificationStatusEnum status);

    List<Notification> findByRecipientIdAndStatusOrderByCreatedAtDesc(Long recipientId, NotificationStatusEnum status);

    long countByRecipientIdIsNullAndStatus(NotificationStatusEnum status);

    long countByRecipientIdAndStatus(Long recipientId, NotificationStatusEnum status);

    @Query("""
            select notification from Notification notification
            where notification.recipientId = :recipientId
              and (notification.recipientScope is null or notification.recipientScope = 'BANK')
            order by notification.createdAt desc
            """)
    List<Notification> findAllBankNotifications(@Param("recipientId") Long recipientId);

    @Query("""
            select notification from Notification notification
            where notification.recipientId = :recipientId
              and (notification.recipientScope is null or notification.recipientScope = 'USER')
            order by notification.createdAt desc
            """)
    List<Notification> findAllUserNotifications(@Param("recipientId") Long recipientId);

    @Query("""
            select notification from Notification notification
            where notification.recipientId = :recipientId and notification.status = :status
              and (notification.recipientScope is null or notification.recipientScope = 'BANK')
            order by notification.createdAt desc
            """)
    List<Notification> findUnreadBankNotifications(@Param("recipientId") Long recipientId, @Param("status") NotificationStatusEnum status);

    @Query("""
            select count(notification) from Notification notification
            where notification.recipientId = :recipientId and notification.status = :status
              and (notification.recipientScope is null or notification.recipientScope = 'BANK')
            """)
    long countUnreadBankNotifications(@Param("recipientId") Long recipientId, @Param("status") NotificationStatusEnum status);

    @Query("""
            select count(notification) from Notification notification
            where notification.recipientId = :recipientId and notification.status = :status
              and (notification.recipientScope is null or notification.recipientScope = 'USER')
            """)
    long countUnreadUserNotifications(@Param("recipientId") Long recipientId, @Param("status") NotificationStatusEnum status);

    @Query("""
            select notification from Notification notification
            where notification.id = :id and notification.recipientId = :recipientId
              and (notification.recipientScope is null or notification.recipientScope = 'BANK')
            """)
    java.util.Optional<Notification> findBankNotificationById(@Param("id") Long id, @Param("recipientId") Long recipientId);

    @Query("""
            select notification from Notification notification
            where notification.id = :id and notification.recipientId = :recipientId
              and (notification.recipientScope is null or notification.recipientScope = 'USER')
            """)
    java.util.Optional<Notification> findUserNotificationById(@Param("id") Long id, @Param("recipientId") Long recipientId);

    @Query("""
            select notification from Notification notification
            where notification.recipientId = :recipientId and notification.status = :status
              and (notification.recipientScope is null or notification.recipientScope = 'USER')
            order by notification.createdAt desc
            """)
    List<Notification> findUnreadUserNotifications(@Param("recipientId") Long recipientId, @Param("status") NotificationStatusEnum status);

    java.util.Optional<Notification> findByIdAndRecipientIdIsNull(Long id);

    java.util.Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    boolean existsByTypeAndRelatedRequestIdAndRecipientId(NotificationTypeEnum type, Long relatedRequestId, Long recipientId);

    java.util.Optional<Notification> findFirstByTypeAndRelatedRequestIdAndRecipientIdOrderByCreatedAtDesc(
            NotificationTypeEnum type,
            Long relatedRequestId,
            Long recipientId
    );

    java.util.Optional<Notification> findFirstByTypeAndRelatedRequestIdAndRecipientIdAndRecipientScopeOrderByCreatedAtDesc(
            NotificationTypeEnum type,
            Long relatedRequestId,
            Long recipientId,
            NotificationRecipientScope recipientScope
    );

    boolean existsByTypeAndRelatedRequestIdAndRecipientIdIsNull(NotificationTypeEnum type, Long relatedRequestId);

    java.util.Optional<Notification> findFirstByTypeAndRelatedRequestIdAndRecipientIdIsNullOrderByCreatedAtDesc(
            NotificationTypeEnum type,
            Long relatedRequestId
    );
}
