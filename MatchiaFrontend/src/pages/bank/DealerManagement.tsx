import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Handshake,
  Package,
  PauseCircle,
  Store,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import {
  dealerService,
  type Partnership,
  type PartnershipStatus,
  type Publication,
  type PublicationStatus,
} from '../../services/dealerService';
import { getBackendAssetUrl } from '../../utils/tenant';

type Tab = 'partnerships' | 'products';
type RejectionTarget =
  | { type: 'partnership'; id: number; name: string }
  | { type: 'product'; id: number; name: string };

const partnershipStatus: Record<PartnershipStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'secondary' }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  APPROVED: { label: 'Approuve', variant: 'success' },
  REJECTED: { label: 'Rejete', variant: 'danger' },
  SUSPENDED: { label: 'Suspendu', variant: 'warning' },
  TERMINATED: { label: 'Termine', variant: 'secondary' },
};

const publicationStatus: Record<PublicationStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'secondary' }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  APPROVED: { label: 'Publie', variant: 'success' },
  REJECTED: { label: 'Rejete', variant: 'danger' },
  INACTIVE: { label: 'Desactive', variant: 'secondary' },
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.detail || data?.message || data?.error || fallback;
};

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '-';

const formatTnd = (value?: number) => new Intl.NumberFormat('fr-TN', {
  style: 'currency',
  currency: 'TND',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

export function DealerManagement() {
  const [tab, setTab] = useState<Tab>('partnerships');
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState<RejectionTarget | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [partnershipResponse, publicationResponse] = await Promise.all([
        dealerService.bankPartnerships(),
        dealerService.bankPublications(),
      ]);
      setPartnerships(partnershipResponse.data || []);
      setPublications(publicationResponse.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger les donnees des concessionnaires.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    if (tab === 'partnerships') {
      return {
        total: partnerships.length,
        pending: partnerships.filter((item) => item.status === 'PENDING').length,
        approved: partnerships.filter((item) => item.status === 'APPROVED').length,
        inactive: partnerships.filter((item) => ['REJECTED', 'SUSPENDED', 'TERMINATED'].includes(item.status)).length,
      };
    }
    return {
      total: publications.length,
      pending: publications.filter((item) => item.status === 'PENDING').length,
      approved: publications.filter((item) => item.status === 'APPROVED').length,
      inactive: publications.filter((item) => ['REJECTED', 'INACTIVE'].includes(item.status)).length,
    };
  }, [partnerships, publications, tab]);

  const decidePartnership = async (
    id: number,
    status: Exclude<PartnershipStatus, 'PENDING'>,
    reason?: string,
  ) => {
    const key = `partnership-${id}-${status}`;
    setActionKey(key);
    try {
      await dealerService.decidePartnership(id, status, reason);
      toast.success(status === 'APPROVED'
        ? 'Partenariat approuve avec succes.'
        : status === 'REJECTED'
          ? 'Partenariat rejete.'
          : status === 'SUSPENDED'
            ? 'Partenariat suspendu.'
            : 'Partenariat termine.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de mettre a jour le partenariat.'));
    } finally {
      setActionKey('');
    }
  };

  const decideProduct = async (
    id: number,
    status: Exclude<PublicationStatus, 'PENDING'>,
    reason?: string,
  ) => {
    const key = `product-${id}-${status}`;
    setActionKey(key);
    try {
      await dealerService.decidePublication(id, status, reason);
      toast.success(status === 'APPROVED'
        ? 'Produit publie avec succes.'
        : status === 'REJECTED'
          ? 'Produit rejete.'
          : 'Produit desactive.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de mettre a jour le produit.'));
    } finally {
      setActionKey('');
    }
  };

  const openRejection = (target: RejectionTarget) => {
    setRejectionTarget(target);
    setRejectionReason('');
  };

  const confirmRejection = async () => {
    if (!rejectionTarget || !rejectionReason.trim()) {
      toast.error('Le motif du rejet est obligatoire.');
      return;
    }
    const target = rejectionTarget;
    if (target.type === 'partnership') {
      await decidePartnership(target.id, 'REJECTED', rejectionReason.trim());
    } else {
      await decideProduct(target.id, 'REJECTED', rejectionReason.trim());
    }
    setRejectionTarget(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Concessionnaires</h1>
          <p className="mt-2 text-muted-foreground">
            Gerez les partenariats et les produits proposes pour votre marketplace.
          </p>
        </div>
       
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tab === 'partnerships' ? 'Partenariats' : 'Produits soumis'}
          value={stats.total}
          badge="Total"
          tone="primary"
          icon={tab === 'partnerships' ? <Handshake className="h-5 w-5" /> : <Package className="h-5 w-5" />}
        />
        <KpiCard
          label="En attente"
          value={stats.pending}
          badge="A traiter"
          tone="warning"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <KpiCard
          label={tab === 'partnerships' ? 'Partenariats actifs' : 'Produits publies'}
          value={stats.approved}
          badge="Actifs"
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Inactifs ou refuses"
          value={stats.inactive}
          badge="Suivi"
          tone="danger"
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <Card className="p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTab('partnerships')}
            className={`flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all ${
              tab === 'partnerships'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Handshake className="h-4 w-4" />
            Partenariats
            <Badge variant={tab === 'partnerships' ? 'outline' : 'secondary'} className={tab === 'partnerships' ? 'border-white/40 text-white' : ''}>
              {partnerships.length}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setTab('products')}
            className={`flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all ${
              tab === 'products'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4" />
            Produits soumis
            <Badge variant={tab === 'products' ? 'outline' : 'secondary'} className={tab === 'products' ? 'border-white/40 text-white' : ''}>
              {publications.length}
            </Badge>
          </button>
        </div>
      </Card>

      <Card className="p-0 shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">
            {tab === 'partnerships' ? 'Demandes de partenariat' : 'Produits proposes par les concessionnaires'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'partnerships'
              ? 'Validez et suivez les concessionnaires souhaitant rejoindre votre reseau.'
              : 'Controlez les produits avant leur publication dans la marketplace.'}
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <LoadingState />
          ) : tab === 'partnerships' ? (
            partnerships.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {partnerships.map((item) => (
                  <PartnershipCard
                    key={item.id}
                    item={item}
                    actionKey={actionKey}
                    onApprove={() => void decidePartnership(item.id, 'APPROVED')}
                    onReject={() => openRejection({ type: 'partnership', id: item.id, name: item.dealer.companyName })}
                    onSuspend={() => void decidePartnership(item.id, 'SUSPENDED')}
                    onTerminate={() => void decidePartnership(item.id, 'TERMINATED')}
                  />
                ))}
              </div>
            ) : <EmptyState type="partnerships" />
          ) : publications.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {publications.map((item) => (
                <PublicationCard
                  key={item.id}
                  item={item}
                  actionKey={actionKey}
                  onApprove={() => void decideProduct(item.id, 'APPROVED')}
                  onReject={() => openRejection({ type: 'product', id: item.id, name: item.product.name })}
                  onDeactivate={() => void decideProduct(item.id, 'INACTIVE')}
                />
              ))}
            </div>
          ) : <EmptyState type="products" />}
        </div>
      </Card>

      <Modal
        isOpen={Boolean(rejectionTarget)}
        onClose={() => setRejectionTarget(null)}
        title="Motif du rejet"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Precisez pourquoi <strong className="text-foreground">{rejectionTarget?.name}</strong> est refuse.
          </p>
          <label className="block space-y-2 text-sm font-medium text-foreground">
            Motif du rejet *
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Saisissez un motif clair..."
              className="w-full resize-none rounded-lg border border-input bg-input-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setRejectionTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={actionKey.includes('REJECTED')}
              onClick={() => void confirmRejection()}
            >
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PartnershipCard({
  item,
  actionKey,
  onApprove,
  onReject,
  onSuspend,
  onTerminate,
}: {
  item: Partnership;
  actionKey: string;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onTerminate: () => void;
}) {
  const isLoading = actionKey.startsWith(`partnership-${item.id}-`);
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-4">
        {item.dealer.logoUrl ? (
          <img
            src={getBackendAssetUrl(item.dealer.logoUrl)}
            alt={`Logo ${item.dealer.companyName}`}
            className="h-16 w-16 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Handshake className="h-7 w-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-lg font-semibold text-foreground">{item.dealer.companyName}</h3>
            <Badge variant={partnershipStatus[item.status].variant}>{partnershipStatus[item.status].label}</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <InfoLine icon={<Store className="h-4 w-4" />} value={item.storeName} />
            <InfoLine icon={<UserRound className="h-4 w-4" />} value={item.dealer.contactPerson} />
            <InfoLine icon={<CalendarDays className="h-4 w-4" />} value={`Demande du ${formatDate(item.requestDate)}`} />
            <InfoLine icon={<Handshake className="h-4 w-4" />} value={item.bankName} />
          </div>
        </div>
      </div>

      {item.message && <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">{item.message}</p>}
      {item.rejectionReason && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Motif : {item.rejectionReason}</p>}

      <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {item.status === 'PENDING' && (
          <>
            <Button variant="danger" size="sm" icon={<XCircle className="h-4 w-4" />} disabled={isLoading} onClick={onReject}>Rejeter</Button>
            <Button variant="success" size="sm" icon={<CheckCircle2 className="h-4 w-4" />} loading={actionKey === `partnership-${item.id}-APPROVED`} onClick={onApprove}>Approuver</Button>
          </>
        )}
        {item.status === 'APPROVED' && (
          <>
            <Button variant="outline" size="sm" icon={<PauseCircle className="h-4 w-4" />} loading={actionKey === `partnership-${item.id}-SUSPENDED`} onClick={onSuspend}>Suspendre</Button>
            <Button variant="danger" size="sm" icon={<Ban className="h-4 w-4" />} loading={actionKey === `partnership-${item.id}-TERMINATED`} onClick={onTerminate}>Terminer</Button>
          </>
        )}
      </div>
    </article>
  );
}

function PublicationCard({
  item,
  actionKey,
  onApprove,
  onReject,
  onDeactivate,
}: {
  item: Publication;
  actionKey: string;
  onApprove: () => void;
  onReject: () => void;
  onDeactivate: () => void;
}) {
  const isLoading = actionKey.startsWith(`product-${item.id}-`);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        {item.product.imageUrl ? (
          <img
            src={getBackendAssetUrl(item.product.imageUrl)}
            alt={item.product.name}
            className="h-40 w-full shrink-0 rounded-xl border border-border bg-muted/20 object-contain sm:h-28 sm:w-36"
          />
        ) : (
          <span className="flex h-40 w-full shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-28 sm:w-36">
            <Package className="h-9 w-9" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">{item.product.name}</h3>
            <Badge variant={publicationStatus[item.status].variant}>{publicationStatus[item.status].label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.dealerName} - {item.storeName}</p>
          <div className="mt-3 text-lg font-bold text-destructive">{formatTnd(Number(item.product.price))}</div>
          <div className="mt-2 text-xs text-muted-foreground">Soumis le {formatDate(item.submittedAt)}</div>
        </div>
      </div>

      {item.product.description && (
        <p className="mx-5 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">{item.product.description}</p>
      )}

      {item.product.parameterValues.length > 0 && (
        <div className="mx-5 mt-4 flex flex-wrap gap-2">
          {item.product.parameterValues.map((value) => (
            <Badge key={value.definitionId} variant="outline">
              {value.name || 'Caracteristique'} : {value.value || '-'}
            </Badge>
          ))}
        </div>
      )}

      {item.rejectionReason && <p className="mx-5 mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Motif : {item.rejectionReason}</p>}

      <div className="mt-auto flex flex-wrap justify-end gap-2 p-5 pt-4">
        {item.status === 'PENDING' && (
          <>
            <Button variant="danger" size="sm" icon={<XCircle className="h-4 w-4" />} disabled={isLoading} onClick={onReject}>Rejeter</Button>
            <Button variant="success" size="sm" icon={<CheckCircle2 className="h-4 w-4" />} loading={actionKey === `product-${item.id}-APPROVED`} onClick={onApprove}>Publier</Button>
          </>
        )}
        {item.status === 'APPROVED' && (
          <Button variant="outline" size="sm" icon={<Ban className="h-4 w-4" />} loading={actionKey === `product-${item.id}-INACTIVE`} onClick={onDeactivate}>Desactiver</Button>
        )}
      </div>
    </article>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-primary">{icon}</span><span className="truncate">{value}</span></span>;
}

function LoadingState() {
  return (
    <div className="flex min-h-56 items-center justify-center gap-3 text-muted-foreground">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Chargement des donnees...
    </div>
  );
}

function EmptyState({ type }: { type: Tab }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {type === 'partnerships' ? <Handshake className="h-7 w-7" /> : <Package className="h-7 w-7" />}
      </span>
      <h3 className="mt-4 font-semibold text-foreground">
        {type === 'partnerships' ? 'Aucune demande de partenariat' : 'Aucun produit soumis'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">Les nouvelles demandes apparaitront automatiquement dans cette section.</p>
    </div>
  );
}
