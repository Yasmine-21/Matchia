import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart3, CalendarX2, Clock3, Eye } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';

interface OrganizationRequestSubscriptionDto {
  paymentId: number;
  requestId: number | null;
  bankName: string;
  bankLogoUrl?: string | null;
  marketplaceSlug: string | null;
  amount?: number | string | null;
  currency?: string | null;
  paidAt?: string | null;
  stores?: {
    storeId: number;
    storeName?: string | null;
    storeDescription?: string | null;
    storePrice?: number | string | null;
    modules?: {
      moduleId: number;
      moduleName?: string | null;
      moduleDescription?: string | null;
      moduleCategory?: string | null;
      modulePrice?: number | string | null;
    }[];
  }[];
}

const formatTnd = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
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

const formatDateTime = (value?: string | null) => {
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
    hour: '2-digit',
    minute: '2-digit',
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
  const [searchParams] = useSearchParams();
  const [selectedSubscription, setSelectedSubscription] = useState<OrganizationRequestSubscriptionDto | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const autoOpenedRequestRef = useRef<string | null>(null);
  const requestedRequestId = searchParams.get('requestId');

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

  useEffect(() => {
    if (!requestedRequestId || !subscriptions.length) {
      return;
    }

    if (autoOpenedRequestRef.current === requestedRequestId) {
      return;
    }

    const matchedSubscription = subscriptions.find(
      (subscription) => String(subscription.requestId ?? '') === requestedRequestId
    );

    if (matchedSubscription) {
      autoOpenedRequestRef.current = requestedRequestId;
      setSelectedSubscription(matchedSubscription);
      setIsDetailsOpen(true);
    }
  }, [requestedRequestId, subscriptions]);

  const subscriptionStats = useMemo(() => {
    let active = 0;
    let expired = 0;

    subscriptions.forEach((subscription) => {
      const expirationDate = addOneMonth(subscription.paidAt);
      const daysRemaining = getDaysRemaining(expirationDate);

      if (daysRemaining !== null && daysRemaining >= 0) {
        active += 1;
      } else if (daysRemaining !== null && daysRemaining < 0) {
        expired += 1;
      }
    });

    return {
      active,
      expired,
      total: subscriptions.length,
    };
  }, [subscriptions]);

  const openDetails = (subscription: OrganizationRequestSubscriptionDto) => {
    setSelectedSubscription(subscription);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offres et abonnements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Liste des abonnements dont le paiement est marque comme paye.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Abonnement actif"
          value={subscriptionStats.active}
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
          badge={`${subscriptionStats.active} abonnements`}
        />
        <KpiCard
          label="Abonnement expiré"
          value={subscriptionStats.expired}
          icon={<CalendarX2 className="h-5 w-5" />}
          tone="success"
          badge={`${subscriptionStats.expired} abonnements`}
        />
        <KpiCard
          label="Total"
          value={subscriptionStats.total}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="danger"
          badge={`${subscriptionStats.total} abonnements`}
        />
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
                          <Button size="icon" variant="ghost" onClick={() => openDetails(subscription)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir détails</span>
                          </Button>
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

      <Modal
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        title="Détails du paiement"
        size="lg"
      >
        {selectedSubscription && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                    Paiement réussi
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    Détails du paiement enregistré pour l&apos;abonnement de la banque.
                  </div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200">
                  Reçu le {formatDateTime(selectedSubscription.paidAt)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Banque</p>
                <p className="mt-1 text-base font-semibold text-foreground">{selectedSubscription.bankName}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Marketplace</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {selectedSubscription.marketplaceSlug || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Montant payé</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatTnd(Number(selectedSubscription.amount))}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Date et heure de paiement</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatDateTime(selectedSubscription.paidAt)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Stores de cet abonnement
                  </p>
                  <h4 className="mt-1 text-lg font-semibold text-foreground">
                    {(selectedSubscription.stores || []).length} store{(selectedSubscription.stores || []).length > 1 ? 's' : ''}
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Chaque store est affiché avec les modules payés dans ce paiement.
                  </p>
                </div>
                <Badge variant="default">Paiement unique</Badge>
              </div>

              {(selectedSubscription.stores || []).length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                  Aucun détail de store n&apos;est disponible pour cet abonnement.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {(selectedSubscription.stores || []).map((store) => (
                    <div key={store.storeId} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{store.storeName || 'Store'}</p>
                          {store.storeDescription ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{store.storeDescription}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prix store</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatTnd(Number(store.storePrice))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Modules
                        </p>
                        {(store.modules || []).length === 0 ? (
                          <div className="mt-3 rounded-xl border border-dashed border-border bg-white px-4 py-5 text-center text-sm text-muted-foreground">
                            Aucun module associé à ce store.
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {(store.modules || []).map((module) => (
                              <div key={module.moduleId} className="rounded-xl border border-border bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {module.moduleName || 'Module'}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                                      {module.moduleCategory || 'Module'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Prix</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatTnd(Number(module.modulePrice))}
                                    </p>
                                  </div>
                                </div>
                                {module.moduleDescription ? (
                                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {module.moduleDescription}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
