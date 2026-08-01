import { CheckCheck, Trash2 } from 'lucide-react';
import { NotificationDto } from '../../types/apiTypes';

interface NotificationsPanelProps {
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAllAsRead: () => void;
  onOpenNotification: (notification: NotificationDto) => void;
  onDeleteNotification: (notificationId: number) => void;
  className?: string;
}

const getNotificationTypeLabel = (value?: string) => {
  switch (value) {
    case 'SUCCESS':
      return 'Succès';

    case 'WARNING':
      return 'Avertissement';

    case 'ERROR':
      return 'Erreur';

    case 'PAYMENT_SUCCESS':
      return 'Paiement réussi';

    case 'INFO':
    default:
      return 'Information';
  }
};

const formatNotificationDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkAllAsRead,
  onOpenNotification,
  onDeleteNotification,
  className = '',
}: NotificationsPanelProps) {
  return (
    <div
      className={`
        w-[440px]
        max-w-[calc(100vw-2rem)]
        overflow-hidden
        rounded-xl
        border
        border-gray-200
        bg-white
        opacity-100
        shadow-xl
        ${className}
      `}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            Notifications
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notification(s) non lue(s)`
              : 'Aucune notification non lue'}
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllAsRead}
          disabled={unreadCount === 0}
          className="
            inline-flex
            shrink-0
            items-center
            gap-1
            whitespace-nowrap
            rounded-md
            border
            border-orange-300
            bg-white
            px-3
            py-1.5
            text-xs
            font-medium
            text-orange-700
            transition-colors
            hover:bg-orange-50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Tout lire
        </button>
      </div>

      {/* Liste des notifications */}
      <div className="max-h-[36rem] overflow-x-hidden overflow-y-auto bg-white p-2">
        {isLoading ? (
          <div className="bg-white px-4 py-8 text-center text-sm text-gray-500">
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white px-4 py-8 text-center text-sm text-gray-500">
            Aucune nouvelle notification
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = notification.status === 'UNREAD';

            return (
              <div
                key={notification.id}
                className={`
                  mb-2
                  rounded-lg
                  border
                  p-3
                  last:mb-0
                  ${
                    isUnread
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">
                        {notification.title || 'Notification'}
                      </div>

                      {isUnread && (
                        <span
                          className="
                            shrink-0
                            whitespace-nowrap
                            rounded-full
                            bg-orange-200
                            px-2
                            py-0.5
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-wide
                            text-orange-800
                          "
                        >
                          Non lue
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-orange-700">
                      {getNotificationTypeLabel(notification.type)}
                    </div>

                    <div className="mt-2 break-words text-sm leading-5 text-gray-600">
                      {notification.message}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {formatNotificationDate(notification.createdAt)}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenNotification(notification)}
                      className="
                        mt-3
                        text-sm
                        font-medium
                        text-orange-600
                        transition-colors
                        hover:text-orange-700
                      "
                    >
                      Voir détails
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteNotification(notification.id);
                    }}
                    className="
                      inline-flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      bg-transparent
                      text-gray-500
                      transition-colors
                      hover:bg-red-50
                      hover:text-red-600
                    "
                    aria-label="Supprimer la notification"
                    title="Supprimer la notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}