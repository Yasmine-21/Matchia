import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  ChevronRight,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBankTenant } from '../../hooks/useBankTenant';
import apiClient from '../../api/apiClient';
import { requestService } from '../../services/requestService';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { getBackendAssetUrl } from '../../utils/tenant';
import type { PaidSubscriptionDto, RequestDto } from '../../types/apiTypes';

const formatTnd = (value?: number | string | null) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('fr-TN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const addOneMonth = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const expiration = new Date(date);
  expiration.setMonth(expiration.getMonth() + 1);
  return expiration;
};

const formatDateFromDate = (value?: Date | null) => {
  if (!value || Number.isNaN(value.getTime())) return '-';
  return new Intl.DateTimeFormat('fr-TN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
};

const getDaysRemaining = (expirationDate: Date | null) => {
  if (!expirationDate) return null;
  const diffMs = expirationDate.getTime() - new Date().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getSubscriptionStatus = (daysRemaining: number | null) => {
  if (daysRemaining === null) {
    return { label: 'Aucun paiement trouvé', tone: 'warning' as const };
  }
  if (daysRemaining < 0) {
    return { label: 'Expiré', tone: 'danger' as const };
  }
  if (daysRemaining <= 7) {
    return { label: 'Renouvellement urgent', tone: 'warning' as const };
  }
  return { label: 'Actif', tone: 'success' as const };
};

const formatDaysRemaining = (daysRemaining: number | null) => {
  if (daysRemaining === null) return 'Non disponible';
  if (daysRemaining < 0) return 'Expiré';
  if (daysRemaining === 0) return "Expire aujourd'hui";
  return `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`;
};

const getBackendAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function BankSubscription() {
  const { currentBank, currentUser } = useApp();
  const { marketplace, isLoading: isTenantLoading, error: tenantError, refresh } = useBankTenant();
  const [subscriptions, setSubscriptions] = useState<PaidSubscriptionDto[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [error, setError] = useState('');
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<RequestDto | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!marketplace?.bankSlug) {
        setSubscriptions([]);
        setIsLoadingSubscriptions(false);
        return;
      }

      setIsLoadingSubscriptions(true);
      setError('');
      try {
        const response = await apiClient.get<PaidSubscriptionDto[]>('/api/payments/paid-subscriptions');
        setSubscriptions(response.data || []);
      } catch (loadError) {
        console.error('Failed to load paid subscriptions:', loadError);
        setError("Impossible de charger l'historique des abonnements.");
        setSubscriptions([]);
      } finally {
        setIsLoadingSubscriptions(false);
      }
    };

    void loadSubscriptions();
  }, [marketplace?.bankSlug]);

  const marketplaceSlug = marketplace?.bankSlug?.trim() || currentBank?.slug?.trim() || '';

  const marketplaceSubscriptions = useMemo(() => {
    if (!marketplaceSlug) {
      return [];
    }

    return [...subscriptions]
      .filter((subscription) => subscription.marketplaceSlug?.trim() === marketplaceSlug)
      .sort((a, b) => {
        const left = new Date(b.paidAt || 0).getTime();
        const right = new Date(a.paidAt || 0).getTime();
        return left - right;
      });
  }, [subscriptions, marketplaceSlug]);

  useEffect(() => {
    if (!marketplaceSubscriptions.length) {
      if (selectedPaymentId !== null) {
        setSelectedPaymentId(null);
      }
      return;
    }

    const selectedExists = marketplaceSubscriptions.some((subscription) => subscription.paymentId === selectedPaymentId);
    if (!selectedExists) {
      setSelectedPaymentId(marketplaceSubscriptions[0].paymentId);
    }
  }, [marketplaceSubscriptions, selectedPaymentId]);

  const selectedSubscription = useMemo(() => {
    if (!marketplaceSubscriptions.length) {
      return null;
    }

    return (
      marketplaceSubscriptions.find((subscription) => subscription.paymentId === selectedPaymentId) ||
      marketplaceSubscriptions[0] ||
      null
    );
  }, [marketplaceSubscriptions, selectedPaymentId]);

  const renewalAmount = useMemo(() => {
    return getBackendAmount(selectedSubscription?.amount) ?? marketplace?.totalMonthlyPrice ?? 0;
  }, [marketplace?.totalMonthlyPrice, selectedSubscription?.amount]);

  const paidAtDate = selectedSubscription?.paidAt || null;
  const expirationDate = addOneMonth(paidAtDate);
  const daysRemaining = getDaysRemaining(expirationDate);
  const statusInfo = getSubscriptionStatus(daysRemaining);
  const bankLogoUrl = marketplace?.bankLogoUrl || currentBank?.logoUrl || selectedSubscription?.bankLogoUrl || null;
  const bankName = marketplace?.bankName || currentBank?.name || selectedSubscription?.bankName || 'Votre banque';
  const tenantBankId = currentBank?.id || marketplace?.bankId || null;
  const renewalDescription = `Renouvellement de l'abonnement marketplace pour ${bankName}.`;

  const submitRenewalRequest = async () => {
    if (!marketplaceSlug || !tenantBankId) {
      setError("Impossible d'identifier la banque courante.");
      return;
    }

    if (!renewalAmount || renewalAmount <= 0) {
      setError('Le montant du renouvellement est introuvable.');
      return;
    }

    const contactEmail = currentUser?.email || marketplace?.bankEmail || currentBank?.email || '';
    if (!contactEmail) {
      setError("L'email de contact est requis pour envoyer la demande.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await requestService.createBankStoreRequest({
        bankId: tenantBankId,
        requestType: 'subscription',
        bankName,
        bankEmail: currentBank?.email || marketplace?.bankEmail || contactEmail,
        country: currentBank?.country || marketplace?.bankCountry || '',
        website: currentBank?.websiteUrl || marketplace?.bankWebsiteUrl || undefined,
        contactName: currentUser?.name || bankName,
        contactEmail,
        contactPhone: '',
        description: "Demande de renouvellement de l'abonnement marketplace.",
        bankDescription: renewalDescription,
        establishmentYear: currentBank?.establishedYear || currentBank?.establishmentYear || marketplace?.bankEstablishedYear || undefined,
        marketplaceSlug,
        marketplaceDescription: marketplace?.bankDescription || renewalDescription,
        primaryColor: marketplace?.primaryColor || '#0F172A',
        secondaryColor: marketplace?.secondaryColor || '#F97316',
        storeIds: [],
        moduleIds: [],
        selectedStoreDetails: [],
        totalAmount: renewalAmount,
        totalMonthlyPrice: renewalAmount,
        priority: 'high',
        createdBy: currentUser?.email || currentUser?.name || 'bank_subscription_panel',
      });

      setCreatedRequest(response.data);
      setIsRenewalModalOpen(false);
      toast.success('Demande de renouvellement envoyée. Elle sera visible dans le back office SaaS.');
      refresh();
    } catch (submitError) {
      console.error('Failed to create renewal request:', submitError);
      const message = 'La demande de renouvellement a échoué.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPaidSubscription = marketplaceSubscriptions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">
          Suivez l&apos;historique des paiements de votre marketplace et consultez les détails de chaque abonnement.
        </p>
      </div>

      {(error || tenantError) && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || tenantError}
        </div>
      )}

      {isTenantLoading || isLoadingSubscriptions ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement de l&apos;historique des abonnements...
          </CardContent>
        </Card>
      ) : (
        <>
          {hasPaidSubscription && selectedSubscription ? (
            <div className="space-y-6">
              <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                        {getBackendAssetUrl(bankLogoUrl) ? (
                          <img
                            src={getBackendAssetUrl(bankLogoUrl)}
                            alt={bankName}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="h-7 w-7 text-orange-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">MARKETPLACE</div>
                        <div className="mt-1 flex items-center gap-3">
                          <h2 className="truncate text-2xl font-bold">{bankName}</h2>
                          <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-4 xl:mx-8 xl:grid-cols-3 xl:gap-0 xl:divide-x xl:divide-border">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:px-6 xl:py-0">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          Montant
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{formatTnd(selectedSubscription.amount)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:px-6 xl:py-0">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <CalendarClock className="h-4 w-4" />
                          Dernier paiement
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{formatDate(paidAtDate)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:px-6 xl:py-0">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          Expiration
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{formatDateFromDate(expirationDate)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{formatDaysRemaining(daysRemaining)}</div>
                      </div>
                    </div>

                    <Button
                      icon={<RefreshCcw className="h-4 w-4" />}
                      onClick={() => setIsRenewalModalOpen(true)}
                      className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 font-semibold shadow-md hover:from-blue-700 hover:to-blue-600"
                    >
                      Renouveler
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle>Historique des abonnements</CardTitle>
                    <CardDescription>Sélectionnez un paiement pour afficher ses détails et les services inclus.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {marketplaceSubscriptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                        Aucun paiement historique trouvé pour cette marketplace.
                      </div>
                    ) : (
                      marketplaceSubscriptions.map((subscription) => {
                        const rowExpirationDate = addOneMonth(subscription.paidAt);
                        const rowDaysRemaining = getDaysRemaining(rowExpirationDate);
                        const isSelected = subscription.paymentId === selectedSubscription?.paymentId;
                        return (
                          <button
                            key={subscription.paymentId}
                            type="button"
                            onClick={() => setSelectedPaymentId(subscription.paymentId)}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-orange-400 bg-orange-50/70 shadow-sm'
                                : 'border-border bg-white hover:border-orange-200 hover:bg-orange-50/30'
                            }`}
                          >
                            <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
                              <div className="flex items-center justify-center">
                                {isSelected ? (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full border border-slate-300 bg-white" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Payé le</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(subscription.paidAt)}</div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Montant</div>
                                <div className="mt-1 text-sm font-semibold text-orange-500">{formatTnd(subscription.amount)}</div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Expiration</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{formatDateFromDate(rowExpirationDate)}</div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Jours restants</div>
                                <div className="mt-1 text-sm font-semibold text-orange-500">{formatDaysRemaining(rowDaysRemaining)}</div>
                              </div>

                              <div className="flex justify-end text-muted-foreground">
                                <ChevronRight className="h-5 w-5" />
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle>Détails de l'abonnement sélectionné</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Statut</div>
                        <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                      </div>

                      <div className="mt-5 grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Montant à renouveler</div>
                            <div className="mt-1 text-base font-semibold text-foreground">{formatTnd(selectedSubscription.amount)}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expiration</div>
                            <div className="mt-1 text-base font-semibold text-foreground">{formatDateFromDate(expirationDate)}</div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dernier paiement</div>
                            <div className="mt-1 text-base font-semibold text-foreground">{formatDate(selectedSubscription.paidAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Jours restants</div>
                            <div className="mt-1 text-base font-semibold text-foreground">{formatDaysRemaining(daysRemaining)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Stores et modules inclus
                        </p>
                      </div>

                      {(selectedSubscription.stores || []).length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                          Aucun détail de store n&apos;est disponible pour ce paiement.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {(selectedSubscription.stores || []).map((store, index) => (
                            <div key={store.storeId ?? store.storeName} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                      index % 2 === 0 ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}
                                  >
                                    <Building2 className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{store.storeName || 'Store'}</p>
                                    {store.storeDescription ? (
                                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{store.storeDescription}</p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                  {formatTnd(store.storePrice)}
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Modules</div>
                                {(store.modules || []).length === 0 ? (
                                  <div className="mt-3 rounded-xl border border-dashed border-border bg-white px-4 py-5 text-center text-sm text-muted-foreground">
                                    Aucun module associé à ce store.
                                  </div>
                                ) : (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(store.modules || []).map((module) => (
                                      <span
                                        key={module.moduleId ?? module.moduleName}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                      >
                                        {module.moduleName || 'Module'}
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                          {formatTnd(module.modulePrice)}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {createdRequest?.id ? (
                      <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
                        Demande créée avec succès, identifiant #{createdRequest.id}.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

        </>
      )}

      {!isTenantLoading && !isLoadingSubscriptions && !hasPaidSubscription ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Aucun paiement historique trouvé. Le renouvellement utilisera le montant configuré pour la marketplace.
          </CardContent>
        </Card>
      ) : null}

      <Modal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        title="Renouvellement d'abonnement"
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Banque</div>
                <div className="font-medium">{bankName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Marketplace</div>
                <div className="font-medium">{marketplaceSlug || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Montant</div>
                <div className="font-medium">{formatTnd(renewalAmount)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Expiration actuelle</div>
                <div className="font-medium">{formatDateFromDate(expirationDate)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="font-semibold">Confirmation</div>
            <p className="mt-1 text-orange-800">
              En confirmant, une demande de renouvellement sera envoyée au back office SaaS pour traitement.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsRenewalModalOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={submitRenewalRequest}
              disabled={isSubmitting || !renewalAmount || renewalAmount <= 0}
              icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            >
              Confirmer la demande
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
