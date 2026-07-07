import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, CalendarClock, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCcw, Sparkles, ShieldCheck } from 'lucide-react';
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

const formatTnd = (value?: number | null) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

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
        setError("Impossible de charger l'abonnement de la banque.");
        setSubscriptions([]);
      } finally {
        setIsLoadingSubscriptions(false);
      }
    };

    void loadSubscriptions();
  }, [marketplace?.bankSlug]);

  const latestSubscription = useMemo(() => {
    const slug = marketplace?.bankSlug?.trim();
    if (!slug) return null;

    return subscriptions.find((subscription) => subscription.marketplaceSlug?.trim() === slug) || null;
  }, [marketplace?.bankSlug, subscriptions]);

  const renewalAmount = useMemo(() => {
    return getBackendAmount(latestSubscription?.amount) ?? marketplace?.totalMonthlyPrice ?? 0;
  }, [latestSubscription?.amount, marketplace?.totalMonthlyPrice]);

  const paidAtDate = latestSubscription?.paidAt || null;
  const expirationDate = addOneMonth(paidAtDate);
  const daysRemaining = getDaysRemaining(expirationDate);
  const statusInfo = getSubscriptionStatus(daysRemaining);

  const bankLogoUrl = marketplace?.bankLogoUrl || currentBank?.logoUrl || latestSubscription?.bankLogoUrl || null;
  const bankName = marketplace?.bankName || currentBank?.name || latestSubscription?.bankName || 'Votre banque';
  const marketplaceSlug = marketplace?.bankSlug || currentBank?.slug || latestSubscription?.marketplaceSlug || '';
  const tenantBankId = currentBank?.id || marketplace?.bankId || null;
  const renewalDescription = `Renouvellement de l'abonnement marketplace pour ${bankName}.`;

  const submitRenewalRequest = async () => {
    if (!marketplaceSlug || !tenantBankId) {
      setError("Impossible d'identifier la banque courante.");
      return;
    }

    if (!renewalAmount || renewalAmount <= 0) {
      setError("Le montant du renouvellement est introuvable.");
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
      const message = 'La demande de renouvellement a echoue.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPaidSubscription = !!latestSubscription;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Abonnement</h1>
        <p className="text-muted-foreground">
          Suivez l'abonnement marketplace de votre banque et envoyez une demande de renouvellement en un clic.
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
            Chargement de l'abonnement...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="h-2 bg-gradient-to-r from-slate-900 via-orange-500 to-amber-400" />
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
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
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Abonnement marketplace</div>
                    <h2 className="mt-1 text-2xl font-bold">{bankName}</h2>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {marketplaceSlug ? `Slug ${marketplaceSlug}` : 'Slug non disponible'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                      <Badge variant="outline">{latestSubscription?.currency || 'TND'}</Badge>
                    </div>
                  </div>
                </div>

                <Button
                  icon={<RefreshCcw className="h-4 w-4" />}
                  onClick={() => setIsRenewalModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Renouveler
                </Button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    Montant
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatTnd(renewalAmount)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Cycle mensuel</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Paiement
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatDate(paidAtDate)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Dernier paiement enregistré</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Expiration
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatDateFromDate(expirationDate)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {daysRemaining === null
                      ? 'En attente de paiement'
                      : daysRemaining < 0
                        ? 'Abonnement expiré'
                        : `${daysRemaining} jour(s) restants`}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Renouvellement prêt à envoyer
                </div>
                <p className="mt-1 text-orange-800">
                  Cliquez sur Renouveler pour ouvrir les détails, puis confirmez pour envoyer la demande dans le back office SaaS.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Détails du renouvellement</CardTitle>
              <CardDescription>Résumé de l'abonnement et informations envoyées au back office SaaS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Montant à renouveler</span>
                    <span className="font-semibold">{formatTnd(renewalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Dernier paiement</span>
                    <span>{formatDate(paidAtDate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Expiration</span>
                    <span>{formatDateFromDate(expirationDate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Marketplace</span>
                    <span>{marketplaceSlug || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Que se passe-t-il apres confirmation ?
                </div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Une demande de type renouvellement est créée.</li>
                  <li>Le back office SaaS reçoit une notification automatique.</li>
                  <li>La demande apparaît dans la page <span className="font-medium text-foreground">/saas/demandes</span>.</li>
                </ul>
              </div>

              {createdRequest?.id ? (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
                  Demande créée avec succès, identifiant #{createdRequest.id}.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
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
