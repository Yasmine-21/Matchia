import { type FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  Handshake,
  Globe2,
  Image as ImageIcon,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCcw,
  Send,
  Store,
  Upload,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import {
  dealerService,
  type BankOption,
  type DashboardStats,
  type DealerProduct,
  type DealerView,
  type Partnership,
  type PartnershipContract,
  type Publication,
} from '../../services/dealerService';
import { productParameterService } from '../../services/productParameterService';
import type { ProductParameterDefinitionDto } from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';
import { DealerContractsPanel } from '../../components/dealer/DealerContractsPanel';

type Mode = 'dashboard' | 'partnerships' | 'contracts' | 'products' | 'publications' | 'profile';
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline';

const pageMeta: Record<Mode, { title: string; description: string }> = {
  dashboard: {
    title: 'Tableau de bord',
    description: 'Suivez vos produits, partenariats et publications depuis un espace centralise.',
  },
  partnerships: {
    title: 'Partenariats bancaires',
    description: 'Demandez et suivez vos partenariats avec les banques compatibles.',
  },
  contracts: {
    title: 'Contrats de partenariat',
    description: 'Consultez et acceptez les contrats gratuits proposes par vos banques partenaires.',
  },
  products: {
    title: 'Catalogue produits',
    description: 'Creez et gerez les produits proposes aux marketplaces partenaires.',
  },
  publications: {
    title: 'Suivi des publications',
    description: 'Consultez le statut de chaque produit soumis aux banques partenaires.',
  },
  profile: {
    title: 'Profil concessionnaire',
    description: 'Consultez les informations professionnelles de votre compte.',
  },
};

const statusMeta = (status: string): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case 'APPROVED': return { label: 'Approuve', variant: 'success' };
    case 'ACTIVE': return { label: 'Actif', variant: 'success' };
    case 'PENDING': return { label: 'En attente', variant: 'warning' };
    case 'WAITING_CONTRACT': return { label: 'Contrat en preparation', variant: 'warning' };
    case 'DRAFT': return { label: 'Brouillon', variant: 'warning' };
    case 'INACTIVE': return { label: 'Inactif', variant: 'secondary' };
    case 'SUSPENDED': return { label: 'Suspendu', variant: 'warning' };
    case 'TERMINATED': return { label: 'Termine', variant: 'secondary' };
    case 'REJECTED': return { label: 'Rejete', variant: 'danger' };
    default: return { label: status, variant: 'default' };
  }
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

const getErrorMessage = (error: unknown, fallback: string) => {
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.detail || data?.message || data?.error || fallback;
};

export function DealerWorkspace({ mode }: { mode: Mode }) {
  const [dealer, setDealer] = useState<DealerView | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [contracts, setContracts] = useState<PartnershipContract[]>([]);
  const [products, setProducts] = useState<DealerProduct[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [definitions, setDefinitions] = useState<ProductParameterDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<DealerProduct | null>(null);
  const [submittingPartnership, setSubmittingPartnership] = useState(false);
  const [partnershipError, setPartnershipError] = useState('');
  const [partnershipAction, setPartnershipAction] = useState('');
  const [invitationToReject, setInvitationToReject] = useState<Partnership | null>(null);
  const [invitationRejectionReason, setInvitationRejectionReason] = useState('');
  const [productToSubmit, setProductToSubmit] = useState<DealerProduct | null>(null);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
  const [submittingProductId, setSubmittingProductId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const me = await dealerService.me();
      setDealer(me.data);
      const [dashboard, bankList, partnershipList, contractList, productList, publicationList, definitionList] = await Promise.all([
        dealerService.dashboard(),
        dealerService.availableBanks(),
        dealerService.partnerships(),
        dealerService.dealerContracts(),
        dealerService.products(),
        dealerService.publications(),
        productParameterService.getByStore(me.data.storeId),
      ]);
      setStats(dashboard.data);
      setBanks(bankList.data || []);
      setPartnerships(partnershipList.data || []);
      setContracts(contractList.data || []);
      setProducts(productList.data || []);
      setPublications(publicationList.data || []);
      setDefinitions(definitionList.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger votre espace concessionnaire.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approvedPartnerships = useMemo(
    () => partnerships.filter((item) => item.status === 'ACTIVE'),
    [partnerships],
  );

  const requestPartnership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dealer) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const bankId = Number(form.get('bankId'));
    const storeId = dealer.storeId;
    if (!Number.isInteger(bankId) || bankId <= 0 || !Number.isInteger(storeId) || storeId <= 0) {
      setPartnershipError('Selectionnez une banque partenaire valide.');
      return;
    }
    setSubmittingPartnership(true);
    setPartnershipError('');
    try {
      await dealerService.requestPartnership(bankId, storeId, String(form.get('message') || '').trim());
      toast.success('Demande de partenariat envoyee.');
      formElement.reset();
      await load();
    } catch (error) {
      const message = getErrorMessage(error, "Impossible d'envoyer la demande de partenariat.");
      setPartnershipError(message);
      toast.error(message);
    } finally {
      setSubmittingPartnership(false);
    }
  };

  const approveInvitation = async (id: number) => {
    setPartnershipAction(`approve-${id}`);
    try {
      await dealerService.approveDealerInvitation(id);
      toast.success('Invitation acceptee. Le contrat est maintenant en preparation.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible d'accepter l'invitation."));
    } finally {
      setPartnershipAction('');
    }
  };

  const rejectInvitation = async () => {
    if (!invitationToReject || !invitationRejectionReason.trim()) {
      toast.error('Le motif du rejet est obligatoire.');
      return;
    }
    setPartnershipAction(`reject-${invitationToReject.id}`);
    try {
      await dealerService.rejectDealerInvitation(invitationToReject.id, invitationRejectionReason.trim());
      toast.success('Invitation rejetee.');
      setInvitationToReject(null);
      setInvitationRejectionReason('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible de rejeter l'invitation."));
    } finally {
      setPartnershipAction('');
    }
  };

  const cancelRequest = async (id: number) => {
    setPartnershipAction(`cancel-${id}`);
    try {
      await dealerService.cancelDealerRequest(id);
      toast.success('Demande annulee.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible d'annuler la demande."));
    } finally {
      setPartnershipAction('');
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dealer) return;
    const form = new FormData(event.currentTarget);
    const imageFile = form.get('image') as File | null;
    const image = imageFile?.size ? imageFile : undefined;
    const parameterValues = definitions.map((definition) => ({
      definitionId: definition.id,
      value: String(form.get(`param-${definition.id}`) || ''),
    }));
    setSavingProduct(true);
    try {
      await dealerService.saveProduct({
        storeId: dealer.storeId,
        name: form.get('name'),
        description: form.get('description'),
        price: Number(form.get('price')),
        eligibilityConditions: form.get('eligibilityConditions'),
        status: form.get('status'),
        parameterValues,
      }, image, editProduct?.id);
      toast.success(editProduct ? 'Produit modifie avec succes.' : 'Produit ajoute avec succes.');
      setShowProductForm(false);
      setEditProduct(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible d'enregistrer le produit."));
    } finally {
      setSavingProduct(false);
    }
  };

  const openSubmission = (product: DealerProduct) => {
    if (approvedPartnerships.length === 0) {
      toast.error('Aucun partenariat approuve ne permet de soumettre ce produit.');
      return;
    }
    setProductToSubmit(product);
    setSelectedPartnershipId(approvedPartnerships.length === 1 ? String(approvedPartnerships[0].id) : '');
  };

  const submitProduct = async () => {
    if (!productToSubmit || !selectedPartnershipId) {
      toast.error('Selectionnez une banque partenaire.');
      return;
    }
    setSubmittingProductId(productToSubmit.id);
    try {
      await dealerService.submitProduct(productToSubmit.id, Number(selectedPartnershipId));
      toast.success('Produit soumis a la banque.');
      setProductToSubmit(null);
      setSelectedPartnershipId('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de soumettre le produit.'));
    } finally {
      setSubmittingProductId(null);
    }
  };

  if (loading && !dealer) return <LoadingState label="Chargement de votre espace concessionnaire..." />;
  if (!dealer) return <EmptyState icon={<Building2 className="h-8 w-8" />} title="Compte concessionnaire indisponible" description="Actualisez la page ou reconnectez-vous." />;

  const meta = pageMeta[mode];

  return (
    <div className="space-y-6">
      {mode !== 'partnerships' && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{meta.title}</h1>
            <p className="mt-2 text-muted-foreground">{meta.description}</p>
          </div>
          {mode !== 'publications' && (
            <Button variant="outline" icon={<RefreshCcw className="h-4 w-4" />} loading={loading} onClick={() => void load()}>
              Actualiser
            </Button>
          )}
        </div>
      )}

      {mode === 'dashboard' && (
        <Dashboard
          stats={stats}
          partnerships={partnerships}
          products={products}
          publications={publications}
          onEdit={(product) => { setEditProduct(product); setShowProductForm(true); }}
          onSubmit={openSubmission}
        />
      )}
      {mode === 'profile' && <DealerProfile dealer={dealer} />}
      {mode === 'partnerships' && (
        <Partnerships
          dealer={dealer}
          banks={banks}
          partnerships={partnerships}
          error={partnershipError}
          submitting={submittingPartnership}
          onSubmit={requestPartnership}
          actionKey={partnershipAction}
          onApprove={approveInvitation}
          onReject={setInvitationToReject}
          onCancel={cancelRequest}
        />
      )}
      {mode === 'contracts' && <DealerContractsPanel contracts={contracts} onChanged={load} />}
      {mode === 'products' && (
        <Products
          products={products}
          onCreate={() => { setEditProduct(null); setShowProductForm(true); }}
          onEdit={(product) => { setEditProduct(product); setShowProductForm(true); }}
          onSubmit={openSubmission}
        />
      )}
      {mode === 'publications' && <Publications publications={publications} />}

      <ProductFormModal
        isOpen={showProductForm}
        product={editProduct}
        definitions={definitions}
        saving={savingProduct}
        onClose={() => { if (!savingProduct) { setShowProductForm(false); setEditProduct(null); } }}
        onSubmit={saveProduct}
      />

      <Modal isOpen={Boolean(invitationToReject)} onClose={() => setInvitationToReject(null)} title="Rejeter l'invitation" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Indiquez le motif transmis a {invitationToReject?.bankName}.</p>
          <textarea value={invitationRejectionReason} onChange={(event) => setInvitationRejectionReason(event.target.value)} rows={4} maxLength={1000} className="w-full resize-none rounded-lg border border-input bg-input-background p-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Motif du rejet..." />
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setInvitationToReject(null)}>Annuler</Button>
            <Button variant="danger" className="flex-1" loading={partnershipAction.startsWith('reject-')} onClick={() => void rejectInvitation()}>Confirmer</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(productToSubmit)}
        onClose={() => setProductToSubmit(null)}
        title="Soumettre le produit"
        size="sm"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Produit</div>
            <div className="mt-1 font-semibold text-foreground">{productToSubmit?.name}</div>
          </div>
          <label className="block space-y-2 text-sm font-medium text-foreground">
            Banque partenaire
            <select
              value={selectedPartnershipId}
              onChange={(event) => setSelectedPartnershipId(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selectionnez un partenariat</option>
              {approvedPartnerships.map((partnership) => (
                <option key={partnership.id} value={partnership.id}>{partnership.bankName} - {partnership.storeName}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setProductToSubmit(null)}>Annuler</Button>
            <Button className="flex-1" icon={<Send className="h-4 w-4" />} loading={submittingProductId === productToSubmit?.id} onClick={() => void submitProduct()}>
              Soumettre
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Dashboard({
  stats,
  partnerships,
  products,
  publications,
  onEdit,
  onSubmit,
}: {
  stats: DashboardStats | null;
  partnerships: Partnership[];
  products: DealerProduct[];
  publications: Publication[];
  onEdit: (product: DealerProduct) => void;
  onSubmit: (product: DealerProduct) => void;
}) {
  const activeProducts = products.filter((product) => product.status === 'ACTIVE');
  const activePartnerships = partnerships.filter((partnership) => partnership.status === 'ACTIVE');
  const pendingRequests = partnerships.filter((partnership) => partnership.status === 'PENDING');
  const recentRequests = [...partnerships]
    .filter((partnership) => partnership.status !== 'ACTIVE')
    .sort((left, right) => new Date(right.requestDate).getTime() - new Date(left.requestDate).getTime())
    .slice(0, 5);
  const recentProducts = [...products]
    .sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : left.id;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : right.id;
      return rightDate - leftDate;
    })
    .slice(0, 5);
  const partnerBanks = Array.from(
    new Map(activePartnerships.map((partnership) => [partnership.bankId, partnership])).values(),
  );
  const currentYear = new Date().getFullYear();
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const partnershipEvolution = monthLabels.map((month, monthIndex) => ({
    month,
    partnerships: partnerships.filter((partnership) => {
      if (!partnership.approvedAt) return false;
      const approvedDate = new Date(partnership.approvedAt);
      return approvedDate.getFullYear() === currentYear && approvedDate.getMonth() === monthIndex;
    }).length,
  }));

  const publishedBanksForProduct = (productId: number) => Array.from(
    new Map(
      publications
        .filter((publication) => publication.product.id === productId && publication.status === 'APPROVED' && publication.active)
        .map((publication) => [publication.bankId, publication]),
    ).values(),
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Produits actifs" value={activeProducts.length} badge="Catalogue" tone="primary" icon={<Package className="h-5 w-5" />} />
        <KpiCard label="Banques partenaires" value={partnerBanks.length} badge="Actives" tone="success" icon={<Landmark className="h-5 w-5" />} />
        <KpiCard label="Demandes en attente" value={stats?.pendingPartnerships ?? pendingRequests.length} badge="À traiter" tone="warning" icon={<Clock3 className="h-5 w-5" />} />
        <KpiCard label="Partenariats actifs" value={stats?.activePartnerships ?? activePartnerships.length} badge="Actifs" tone="secondary" icon={<Handshake className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Évolution des partenariats</CardTitle>
          <CardDescription>Nouveaux partenariats acceptés par mois en {currentYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={partnershipEvolution} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [Number(value ?? 0), 'Partenariats']} />
              <Line type="monotone" dataKey="partnerships" name="Partenariats" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-foreground">Dernières demandes de partenariat</h2>
          </div>
          {recentRequests.length === 0 ? (
            <EmptyState icon={<Handshake className="h-7 w-7" />} title="Aucune demande récente" description="Vos prochaines demandes apparaîtront ici." compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-sm font-semibold text-slate-800">Banque</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">Date</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">Statut</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentRequests.map((request) => {
                    const status = statusMeta(request.status);
                    return (
                      <tr key={request.id} className="hover:bg-muted/20">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
                              {request.bankLogoUrl ? <img src={getBackendAssetUrl(request.bankLogoUrl)} alt={`Logo ${request.bankName}`} className="h-full w-full object-contain" /> : <Landmark className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <span className="font-medium text-foreground">{request.bankName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(request.requestDate)}</td>
                        <td className="px-4 py-4"><Badge variant={status.variant}>{status.label}</Badge></td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Banques partenaires</CardTitle>
            <CardDescription>Banques liées par un partenariat actif</CardDescription>
          </CardHeader>
          <CardContent>
            {partnerBanks.length === 0 ? (
              <EmptyState icon={<Landmark className="h-7 w-7" />} title="Aucune banque partenaire" description="Les banques apparaîtront ici après activation du partenariat." compact />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {partnerBanks.map((partnership) => (
                  <div key={partnership.bankId} className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-border bg-muted/10 p-4 text-center">
                    <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                      {partnership.bankLogoUrl ? <img src={getBackendAssetUrl(partnership.bankLogoUrl)} alt={`Logo ${partnership.bankName}`} className="h-full w-full object-contain" /> : <Landmark className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <span className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">{partnership.bankName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">Produits récents</h2>
        </div>
        {recentProducts.length === 0 ? (
          <EmptyState icon={<Package className="h-7 w-7" />} title="Aucun produit récent" description="Les produits ajoutés apparaîtront ici." compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-800">Produit</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-800">Prix</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-800">Statut</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-800">Banques partenaires</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-800">Ajouté le</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentProducts.map((product) => {
                  const status = statusMeta(product.status);
                  const productBanks = publishedBanksForProduct(product.id);
                  return (
                    <tr key={product.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20">
                            {product.imageUrl ? <img src={getBackendAssetUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-contain" /> : <Package className="h-6 w-6 text-muted-foreground" />}
                          </div>
                          <span className="max-w-xs break-words font-semibold text-foreground">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-foreground">{formatTnd(product.price)}</td>
                      <td className="px-5 py-4"><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td className="px-5 py-4">
                        {productBanks.length === 0 ? <span className="text-sm text-muted-foreground">-</span> : (
                          <div className="flex -space-x-2">
                            {productBanks.map((publication) => (
                              <div key={publication.bankId} title={publication.bankName} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-white p-1">
                                {publication.bankLogoUrl ? <img src={getBackendAssetUrl(publication.bankLogoUrl)} alt={publication.bankName} className="h-full w-full object-contain" /> : <Landmark className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(product.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={() => onEdit(product)}>Modifier</Button>
                          <Button size="sm" variant="secondary" icon={<Send className="h-4 w-4" />} disabled={product.status !== 'ACTIVE'} onClick={() => onSubmit(product)}>Soumettre</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function DealerProfile({ dealer }: { dealer: DealerView }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="text-center">
        {dealer.logoUrl ? (
          <img src={getBackendAssetUrl(dealer.logoUrl)} alt={`Logo ${dealer.companyName}`} className="mx-auto h-32 w-32 rounded-2xl border border-border object-contain p-2" />
        ) : (
          <span className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-14 w-14" /></span>
        )}
        <h2 className="mt-5 text-xl font-semibold">{dealer.companyName}</h2>
        <Badge className="mt-3" variant={statusMeta(dealer.status).variant}>{statusMeta(dealer.status).label}</Badge>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg font-semibold">Informations professionnelles</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {dealer.contactPhotoUrl && (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
              <img
                src={getBackendAssetUrl(dealer.contactPhotoUrl)}
                alt={`Photo de ${dealer.contactPerson}`}
                className="h-16 w-16 shrink-0 rounded-full border border-border bg-white object-cover"
              />
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personne de contact</div>
                <div className="mt-1 font-semibold text-foreground">{dealer.contactPerson}</div>
              </div>
            </div>
          )}
          <InfoCard icon={<Building2 className="h-5 w-5" />} label="Immatriculation" value={dealer.registrationNumber} />
          <InfoCard icon={<UserRound className="h-5 w-5" />} label="Personne de contact" value={dealer.contactPerson} />
          <InfoCard icon={<Mail className="h-5 w-5" />} label="E-mail" value={dealer.email} />
          <InfoCard icon={<Phone className="h-5 w-5" />} label="Telephone" value={dealer.phone} />
          <InfoCard icon={<MapPin className="h-5 w-5" />} label="Adresse" value={dealer.address} />
          {dealer.website && <InfoCard icon={<Globe2 className="h-5 w-5" />} label="Site web" value={dealer.website} />}
          <InfoCard icon={<Store className="h-5 w-5" />} label="Store" value={dealer.storeName} />
        </CardContent>
      </Card>
    </div>
  );
}

function Partnerships({
  dealer,
  banks,
  partnerships,
  error,
  submitting,
  onSubmit,
  actionKey,
  onApprove,
  onReject,
  onCancel,
}: {
  dealer: DealerView;
  banks: BankOption[];
  partnerships: Partnership[];
  error: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  actionKey: string;
  onApprove: (id: number) => void;
  onReject: (partnership: Partnership) => void;
  onCancel: (id: number) => void;
}) {
  type PartnershipTab = 'active' | 'received' | 'sent';
  const [activeTab, setActiveTab] = useState<PartnershipTab>('active');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const received = partnerships.filter((item) => item.initiatedBy === 'BANK' && item.status !== 'ACTIVE');
  const sent = partnerships.filter((item) => item.initiatedBy === 'DEALER' && item.status !== 'ACTIVE');
  const active = partnerships.filter((item) => item.status === 'ACTIVE');

  const tabs: Array<{
    id: PartnershipTab;
    label: string;
    rows: Partnership[];
    icon: typeof Landmark;
  }> = [
    { id: 'active', label: 'Partenariats actifs', rows: active, icon: Landmark },
    { id: 'received', label: 'Invitations reçues', rows: received, icon: Mail },
    { id: 'sent', label: 'Demandes envoyées', rows: sent, icon: Send },
  ];
  const selectedTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Partenariats bancaires</h1>
          <p className="mt-2 text-muted-foreground">Demandez et suivez vos partenariats avec les banques compatibles.</p>
        </div>
        <Button icon={<Plus className="h-5 w-5" />} onClick={() => setShowRequestForm(true)}>
          Nouvelle demande
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Partenariats actifs"
          value={active.length}
          badge="Actifs"
          tone="success"
          icon={<Landmark className="h-5 w-5" />}
        />
        <KpiCard
          label="Invitations reçues"
          value={received.length}
          badge="À traiter"
          tone="warning"
          icon={<Mail className="h-5 w-5" />}
        />
        <KpiCard
          label="Demandes envoyées"
          value={sent.length}
          badge="Envoyées"
          tone="primary"
          icon={<Send className="h-5 w-5" />}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex overflow-x-auto border-b border-border px-3 sm:px-5">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-5 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon className="h-5 w-5" />
                {tab.label}
                {tab.id === 'received' && tab.rows.length > 0 ? ` (${tab.rows.length})` : ''}
              </button>
            );
          })}
        </div>

        <PartnershipTable
          rows={selectedTab.rows}
          tab={activeTab}
          actionKey={actionKey}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
        />
      </Card>

      <Modal isOpen={showRequestForm} onClose={() => setShowRequestForm(false)} title="Nouvelle demande" size="sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">Sélectionnez une banque compatible avec votre catégorie.</p>
          {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <FormField label="Banque partenaire *">
            <select name="bankId" required className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sélectionnez une banque</option>
              {banks.map((bank) => <option key={bank.bankId} value={bank.bankId}>{bank.bankName}</option>)}
            </select>
          </FormField>
          <FormField label="Store concerné">
            <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-sm"><Store className="h-4 w-4 text-primary" />{dealer.storeName}</div>
          </FormField>
          <FormField label="Message">
            <textarea name="message" maxLength={1000} rows={5} placeholder="Message optionnel" className="w-full resize-none rounded-lg border border-input bg-input-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowRequestForm(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" icon={<Send className="h-4 w-4" />} loading={submitting} disabled={banks.length === 0}>
              Envoyer la demande
            </Button>
          </div>
          {banks.length === 0 && <p className="text-center text-sm text-muted-foreground">Aucune nouvelle banque compatible n'est disponible pour votre catégorie.</p>}
        </form>
      </Modal>
    </>
  );
}

function PartnershipTable({ rows, tab, actionKey, onApprove, onReject, onCancel }: {
  rows: Partnership[];
  tab: 'active' | 'received' | 'sent';
  actionKey: string;
  onApprove: (id: number) => void;
  onReject: (partnership: Partnership) => void;
  onCancel: (id: number) => void;
}) {
  const dateHeading = tab === 'active' ? 'Depuis le' : tab === 'received' ? 'Reçue le' : 'Envoyée le';

  return (
    <div className="overflow-x-auto p-4 sm:p-5">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-border">
        <thead className="bg-muted/45">
          <tr className="text-left">
            <th className="w-[36%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banque</th>
            <th className="w-[22%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{dateHeading}</th>
            <th className="w-[18%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
            <th className="w-[24%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-14 text-center text-sm text-muted-foreground">Aucun élément dans cette section.</td>
            </tr>
          ) : rows.map((item) => {
            const logoUrl = item.bankLogoUrl ? getBackendAssetUrl(item.bankLogoUrl) : '';
            const displayedDate = tab === 'active'
              ? item.approvedAt || item.processingDate || item.requestDate
              : item.requestDate;
            return (
              <tr key={item.id} className="transition-colors hover:bg-muted/20">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1.5">
                      {logoUrl ? (
                        <img src={logoUrl} alt={`Logo ${item.bankName}`} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground">{item.bankName}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(displayedDate)}</td>
                <td className="px-5 py-4"><Badge variant={statusMeta(item.status).variant}>{statusMeta(item.status).label}</Badge></td>
                <td className="px-5 py-4">
                  {tab === 'received' && item.status === 'PENDING' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="success" icon={<CheckCircle2 className="h-4 w-4" />} loading={actionKey === `approve-${item.id}`} disabled={Boolean(actionKey) && actionKey !== `approve-${item.id}`} onClick={() => onApprove(item.id)}>Accepter</Button>
                      <Button size="sm" variant="danger" icon={<XCircle className="h-4 w-4" />} disabled={Boolean(actionKey)} onClick={() => onReject(item)}>Rejeter</Button>
                    </div>
                  ) : tab === 'sent' && item.status === 'PENDING' && item.initiatedBy === 'DEALER' ? (
                    <Button size="sm" variant="outline" loading={actionKey === `cancel-${item.id}`} onClick={() => onCancel(item.id)}>Annuler la demande</Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Products({ products, onCreate, onEdit, onSubmit }: {
  products: DealerProduct[];
  onCreate: () => void;
  onEdit: (product: DealerProduct) => void;
  onSubmit: (product: DealerProduct) => void;
}) {
  return (
    <>
      <div className="flex justify-end"><Button icon={<Plus className="h-5 w-5" />} onClick={onCreate}>Ajouter un produit</Button></div>
      {products.length === 0 ? (
        <EmptyState icon={<Package className="h-8 w-8" />} title="Aucun produit" description="Ajoutez votre premier produit pour commencer votre catalogue." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
              {product.imageUrl ? (
                <img src={getBackendAssetUrl(product.imageUrl)} alt={product.name} className="h-52 w-full bg-muted/20 object-contain" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-muted/40 text-muted-foreground"><ImageIcon className="h-12 w-12" /></div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
                  <Badge variant={statusMeta(product.status).variant}>{statusMeta(product.status).label}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{product.description || 'Aucune description.'}</p>
                <div className="mt-4 text-xl font-bold text-destructive">{formatTnd(Number(product.price))}</div>
                <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
                  <Button variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={() => onEdit(product)}>Modifier</Button>
                  <Button variant="secondary" icon={<Send className="h-4 w-4" />} disabled={product.status !== 'ACTIVE'} onClick={() => onSubmit(product)}>Soumettre</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Publications({ publications }: { publications: Publication[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-foreground">Historique des publications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chaque ligne correspond à un produit soumis à une banque partenaire.</p>
      </div>

      {publications.length === 0 ? (
        <EmptyState
          icon={<Send className="h-7 w-7" />}
          title="Aucune publication"
          description="Soumettez un produit actif depuis votre catalogue pour le voir ici."
          compact
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-border text-left">
                <th className="w-[38%] px-6 py-4 text-sm font-semibold text-slate-800">Produit</th>
                <th className="w-[18%] px-5 py-4 text-sm font-semibold text-slate-800">Statut</th>
                <th className="w-[28%] px-5 py-4 text-sm font-semibold text-slate-800">Banque partenaire</th>
                <th className="w-[16%] px-5 py-4 text-sm font-semibold text-slate-800">Soumis le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {publications.map((publication) => {
                const status = statusMeta(publication.status);
                const publicationStatusLabel = publication.status === 'APPROVED'
                  ? 'Approuvé'
                  : publication.status === 'PENDING'
                    ? 'En attente'
                    : publication.status === 'REJECTED'
                      ? 'Refusé'
                      : status.label;
                const productImage = publication.product.imageUrl
                  ? getBackendAssetUrl(publication.product.imageUrl)
                  : '';
                const bankLogo = publication.bankLogoUrl
                  ? getBackendAssetUrl(publication.bankLogoUrl)
                  : '';

                return (
                  <tr key={publication.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                          {productImage ? (
                            <img src={productImage} alt={publication.product.name} className="h-full w-full object-contain" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                        <span className="min-w-0 break-words font-semibold text-foreground">{publication.product.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={status.variant}>{publicationStatusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
                          {bankLogo ? (
                            <img src={bankLogo} alt={`Logo ${publication.bankName}`} className="h-full w-full object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                        <span className="min-w-0 break-words font-medium text-foreground">{publication.bankName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{formatDate(publication.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ProductFormModal({ isOpen, product, definitions, saving, onClose, onSubmit }: {
  isOpen: boolean;
  product: DealerProduct | null;
  definitions: ProductParameterDefinitionDto[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Modifier le produit' : 'Nouveau produit'} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nom du produit *">
            <input name="name" required defaultValue={product?.name} placeholder="Nom du produit" className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" />
          </FormField>
          <FormField label="Prix en TND *">
            <input name="price" type="number" min="0" step="0.01" required defaultValue={product?.price} placeholder="0,00" className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea name="description" defaultValue={product?.description} rows={4} placeholder="Description du produit" className="w-full resize-none rounded-lg border border-input bg-input-background p-3 outline-none focus:ring-2 focus:ring-ring" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Statut">
            <select name="status" defaultValue={product?.status || 'DRAFT'} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring">
              <option value="DRAFT">Brouillon</option><option value="ACTIVE">Actif</option><option value="INACTIVE">Inactif</option>
            </select>
          </FormField>
          <FormField label="Image du produit">
            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-input bg-input-background px-3 text-sm text-muted-foreground hover:border-primary">
              <Upload className="h-4 w-4 text-primary" />Selectionner une image
              <input name="image" type="file" accept="image/*" className="hidden" />
            </label>
          </FormField>
        </div>
        <FormField label="Conditions d'eligibilite">
          <textarea name="eligibilityConditions" defaultValue={product?.eligibilityConditions} rows={3} placeholder="Conditions applicables" className="w-full resize-none rounded-lg border border-input bg-input-background p-3 outline-none focus:ring-2 focus:ring-ring" />
        </FormField>
        {definitions.length > 0 && (
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground">Caracteristiques du store</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {definitions.map((definition) => (
                <FormField key={definition.id} label={definition.name}>
                  <input name={`param-${definition.id}`} defaultValue={product?.parameterValues.find((value) => value.definitionId === definition.id)?.value} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" />
                </FormField>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={saving}>{product ? 'Enregistrer les modifications' : 'Ajouter le produit'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0"><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 break-words font-semibold text-foreground">{value || '-'}</div></div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-72 items-center justify-center gap-3 text-muted-foreground"><span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />{label}</div>;
}

function EmptyState({ icon, title, description, compact = false }: { icon: React.ReactNode; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'min-h-56' : 'min-h-72 rounded-xl border border-dashed border-border bg-card'}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">{icon}</span>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
