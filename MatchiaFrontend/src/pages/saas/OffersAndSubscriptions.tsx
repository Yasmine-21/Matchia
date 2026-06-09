import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/apiClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface OrganizationRequestSubscriptionDto {
  paymentId: number;
  requestId: number | null;
  bankName: string;
  bankLogoUrl?: string | null;
  marketplaceSlug: string | null;
  amount?: number | string | null;
  currency?: string | null;
  paidAt?: string | null;
}

const formatTnd = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '-';
  }

  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-TN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateFromDate = (value?: Date | null) => {
  if (!value || Number.isNaN(value.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-TN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
};

const addOneMonth = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const expiration = new Date(date);
  expiration.setMonth(expiration.getMonth() + 1);
  return expiration;
};

const getDaysRemaining = (expirationDate: Date | null) => {
  if (!expirationDate) {
    return null;
  }

  const diffMs = expirationDate.getTime() - new Date().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

export function OffersAndSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<OrganizationRequestSubscriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<OrganizationRequestSubscriptionDto[]>('/api/payments/paid-subscriptions');

        const paidSubscriptions = (response.data || [])
          .sort((a, b) => {
            const left = new Date(b.paidAt || 0).getTime();
            const right = new Date(a.paidAt || 0).getTime();
            return left - right;
          });

        if (isMounted) {
          setSubscriptions(paidSubscriptions);
        }
      } catch (err) {
        console.error('Failed to load paid subscriptions', err);
        if (isMounted) {
          setError('Impossible de charger les abonnements payes.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSubscriptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalPaid = useMemo(
    () => subscriptions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [subscriptions]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offres et abonnements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Liste des abonnements dont le paiement est marque comme paye.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total encaisse</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatTnd(totalPaid)}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Abonnements payes</h3>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">Chargement des abonnements...</div>
        ) : error ? (
          <div className="px-6 py-10 text-sm text-error">{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">Aucun abonnement paye disponible.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Banque</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Marketplace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Montant paye
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Date de paiement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Jours Restants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((subscription) => {
                  const expirationDate = addOneMonth(subscription.paidAt);
                  const daysRemaining = getDaysRemaining(expirationDate);
                  const progressPercent =
                    daysRemaining === null
                      ? 0
                      : Math.max(0, Math.min(100, Math.round((daysRemaining / 30) * 100)));
                  const statusVariant =
                    daysRemaining === null
                      ? 'default'
                      : daysRemaining < 0
                        ? 'danger'
                        : daysRemaining <= 7
                          ? 'warning'
                          : 'success';
                  const statusLabel =
                    daysRemaining === null
                      ? 'Inconnu'
                      : daysRemaining < 0
                        ? 'Expiré'
                        : daysRemaining <= 7
                          ? 'Expiré bientôt'
                          : 'Actif';

                  return (
                    <tr key={subscription.paymentId} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {subscription.bankLogoUrl ? (
                            <img
                              src={getBackendAssetUrl(subscription.bankLogoUrl)}
                              alt={subscription.bankName}
                              className="h-8 w-8 rounded-full border border-border bg-white object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                              {subscription.bankName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="text-sm font-medium text-foreground">{subscription.bankName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {subscription.marketplaceSlug || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {formatTnd(Number(subscription.amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(subscription.paidAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateFromDate(expirationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-[120px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-medium ${
                                daysRemaining === null
                                  ? 'text-muted-foreground'
                                  : daysRemaining < 0
                                    ? 'text-error'
                                    : daysRemaining <= 7
                                      ? 'text-warning'
                                      : 'text-success'
                              }`}
                            >
                              {daysRemaining === null ? '-' : `${daysRemaining}j`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                daysRemaining === null
                                  ? 'bg-gray-300'
                                  : daysRemaining < 0
                                    ? 'bg-error'
                                    : daysRemaining <= 7
                                      ? 'bg-warning'
                                      : 'bg-success'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            Renouveler
                          </Button>
                          <Button size="sm" variant="ghost">
                            Upgrader
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
