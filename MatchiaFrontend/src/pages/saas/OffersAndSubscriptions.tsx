import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart3, CalendarX2, Clock3, Eye } from 'lucide-react';
import apiClient, { resolveApiUrl } from '../../api/apiClient';
import { subscriptionService } from '../../services/subscriptionService';
import { SubscriptionDto } from '../../types/apiTypes';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';

type OrganizationRequestSubscriptionDto = SubscriptionDto;

const formatAmount = (value?: number | null, currency?: string | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: (currency || 'TND').toUpperCase(),
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

const getAnnualTermProgress = (expirationDate?: string | null, daysRemaining?: number | null) => {
  if (!expirationDate || daysRemaining == null) {
    return 0;
  }

  const termEnd = new Date(`${expirationDate}T00:00:00`);
  if (Number.isNaN(termEnd.getTime())) {
    return 0;
  }
  const termStart = new Date(termEnd);
  termStart.setFullYear(termStart.getFullYear() - 1);
  const termDays = Math.max(1, Math.round((termEnd.getTime() - termStart.getTime()) / 86_400_000));
  return Math.max(0, Math.min(100, Math.round((daysRemaining / termDays) * 100)));
};

export function OffersAndSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<OrganizationRequestSubscriptionDto[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState({ active: 0, expired: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [selectedSubscription, setSelectedSubscription] = useState<OrganizationRequestSubscriptionDto | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [renewalSubscription, setRenewalSubscription] = useState<OrganizationRequestSubscriptionDto | null>(null);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const autoOpenedRequestRef = useRef<string | null>(null);
  const requestedRequestId = searchParams.get('requestId');

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await subscriptionService.getOverview();
        const overview = response.data;
        const paidSubscriptions = overview.subscriptions || [];

        if (isMounted) {
          setSubscriptions(paidSubscriptions);
          setSubscriptionStats({
            active: overview.activeCount,
            expired: overview.expiredCount,
            total: overview.totalCount,
          });
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

  const openDetails = (subscription: OrganizationRequestSubscriptionDto) => {
    setSelectedSubscription(subscription);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
  };

  const openRenewal = (subscription: OrganizationRequestSubscriptionDto) => {
    setRenewalSubscription(subscription);
    setIsRenewalOpen(true);
  };

  const confirmRenewal = async () => {
    if (!renewalSubscription?.paymentId) return;
    try {
      setIsRenewing(true);
      await apiClient.post(`/api/payments/${renewalSubscription.paymentId}/renewal`);
      setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === renewalSubscription.subscriptionId
        ? { ...subscription, renewalPending: true, renewalEligible: false, status: 'PENDING_RENEWAL' }
        : subscription));
      setIsRenewalOpen(false);
      setRenewalSubscription(null);
    } catch (renewalError) {
      console.error('Impossible de créer le renouvellement', renewalError);
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offres et abonnements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Liste des souscriptions et de leur cycle de vie courant.
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
                  const daysRemaining = subscription.daysRemaining ?? null;
                  const progressPercent = getAnnualTermProgress(subscription.expirationDate, daysRemaining);
                  const statusVariant =
                    subscription.status === 'PENDING_PAYMENT'
                      ? 'default'
                      : subscription.status === 'EXPIRED'
                        ? 'danger'
                        : subscription.status === 'PENDING_RENEWAL' || (daysRemaining !== null && daysRemaining <= 7)
                          ? 'warning'
                          : 'success';
                  const statusLabel =
                    subscription.status === 'PENDING_PAYMENT' ? 'En attente de paiement'
                      : subscription.status === 'PENDING_RENEWAL' ? 'Renouvellement en attente'
                      : subscription.status === 'EXPIRED' ? 'Expiré'
                      : daysRemaining !== null && daysRemaining <= 7 ? 'Expire bientôt'
                      : 'Actif';

                  return (
                    <tr key={subscription.subscriptionId} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {subscription.bankLogoUrl ? (
                            <img
                              src={resolveApiUrl(subscription.bankLogoUrl)}
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
                        {formatAmount(Number(subscription.amount), subscription.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(subscription.paidAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(subscription.expirationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-[120px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-medium ${
                                daysRemaining === null
                                  ? 'text-muted-foreground'
                                  : subscription.status === 'EXPIRED'
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
                                  : subscription.status === 'EXPIRED'
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
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!subscription.renewalEligible || subscription.renewalPending || !subscription.paymentId}
                            onClick={() => openRenewal(subscription)}
                            className={!subscription.renewalEligible || subscription.renewalPending || !subscription.paymentId ? 'cursor-not-allowed opacity-50' : ''}
                          >
                            Renouveler
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
                  {formatAmount(Number(selectedSubscription.amount), selectedSubscription.currency)}
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
                            {formatAmount(Number(store.storePrice), selectedSubscription.currency)}
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
                                      {formatAmount(Number(module.modulePrice), selectedSubscription.currency)}
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

      <Modal
        isOpen={isRenewalOpen}
        onClose={() => !isRenewing && setIsRenewalOpen(false)}
        title="Renouveler l’abonnement"
        size="lg"
      >
        {renewalSubscription && (() => {
          const daysRemaining = renewalSubscription.daysRemaining ?? null;
          return (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Banque</p><p className="font-semibold">{renewalSubscription.bankName}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Marketplace</p><p className="font-semibold">{renewalSubscription.marketplaceSlug || '-'}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Expiration</p><p className="font-semibold">{formatDate(renewalSubscription.expirationDate)}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Jours restants</p><p className="font-semibold">{daysRemaining ?? '-'} jour(s)</p></div>
              </div>
              <div className="space-y-3">
                <p className="font-semibold">Stores et modules inclus</p>
                {(renewalSubscription.stores || []).map((store) => (
                  <div key={store.storeId} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{store.storeName || 'Store'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{(store.modules || []).map((module) => module.moduleName || 'Module').join(', ') || 'Aucun module'}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-900">
                Période de l’abonnement : <span className="font-semibold">annuelle (12 mois)</span>
              </div>
              <p className="text-sm text-muted-foreground">Un lien de paiement sécurisé sera envoyé à l’administrateur de la banque. Après confirmation du paiement, l’abonnement sera prolongé d’une année supplémentaire.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" disabled={isRenewing} onClick={() => setIsRenewalOpen(false)}>Annuler</Button>
                <Button disabled={isRenewing} onClick={confirmRenewal}>{isRenewing ? 'Création...' : 'Renouveler'}</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
