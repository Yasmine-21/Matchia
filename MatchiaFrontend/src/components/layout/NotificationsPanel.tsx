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
  if (!value) return '-';
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
    <div className={className}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="font-semibold text-gray-900">Notifications</div>
          <div className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Aucune notification non lue'}
          </div>
        </div>
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="inline-flex items-center gap-1 rounded-md border border-orange-200 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Tout lire
        </button>
      </div>

      <div className="max-h-[36rem] overflow-y-auto p-2">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune nouvelle notification</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`mb-2 rounded-lg border p-3 last:mb-0 ${
                notification.status === 'UNREAD' ? 'border-orange-100 bg-orange-50/70' : 'border-border bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {notification.title || 'Notification'}
                    </div>
                    {notification.status === 'UNREAD' && (
                      <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                        Non lue
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-orange-700">
                    {getNotificationTypeLabel(notification.type)}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">{notification.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatNotificationDate(notification.createdAt)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenNotification(notification)}
                    className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  aria-label="Supprimer la notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
