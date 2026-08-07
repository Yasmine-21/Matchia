import { type FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  Handshake,
  Image as ImageIcon,
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
  type Publication,
} from '../../services/dealerService';
import { productParameterService } from '../../services/productParameterService';
import type { ProductParameterDefinitionDto } from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';

type Mode = 'dashboard' | 'partnerships' | 'products' | 'publications' | 'profile';
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
  const [products, setProducts] = useState<DealerProduct[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [definitions, setDefinitions] = useState<ProductParameterDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<DealerProduct | null>(null);
  const [submittingPartnership, setSubmittingPartnership] = useState(false);
  const [partnershipError, setPartnershipError] = useState('');
  const [productToSubmit, setProductToSubmit] = useState<DealerProduct | null>(null);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
  const [submittingProductId, setSubmittingProductId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const me = await dealerService.me();
      setDealer(me.data);
      const [dashboard, bankList, partnershipList, productList, publicationList, definitionList] = await Promise.all([
        dealerService.dashboard(),
        dealerService.availableBanks(),
        dealerService.partnerships(),
        dealerService.products(),
        dealerService.publications(),
        productParameterService.getByStore(me.data.storeId),
      ]);
      setStats(dashboard.data);
      setBanks(bankList.data || []);
      setPartnerships(partnershipList.data || []);
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
    () => partnerships.filter((item) => item.status === 'APPROVED'),
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{meta.title}</h1>
          <p className="mt-2 text-muted-foreground">{meta.description}</p>
        </div>
        <Button variant="outline" icon={<RefreshCcw className="h-4 w-4" />} loading={loading} onClick={() => void load()}>
          Actualiser
        </Button>
      </div>

      {mode === 'dashboard' && <Dashboard dealer={dealer} stats={stats} />}
      {mode === 'profile' && <DealerProfile dealer={dealer} />}
      {mode === 'partnerships' && (
        <Partnerships
          dealer={dealer}
          banks={banks}
          partnerships={partnerships}
          error={partnershipError}
          submitting={submittingPartnership}
          onSubmit={requestPartnership}
        />
      )}
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

function Dashboard({ dealer, stats }: { dealer: DealerView; stats: DashboardStats | null }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Produits" value={stats?.products ?? 0} badge="Catalogue" tone="primary" icon={<Package className="h-5 w-5" />} />
        <KpiCard label="Partenariats actifs" value={stats?.activePartnerships ?? 0} badge="Actifs" tone="success" icon={<Handshake className="h-5 w-5" />} />
        <KpiCard label="Partenariats en attente" value={stats?.pendingPartnerships ?? 0} badge="A traiter" tone="warning" icon={<Clock3 className="h-5 w-5" />} />
        <KpiCard label="Publications en attente" value={stats?.pendingPublications ?? 0} badge="Soumises" tone="warning" icon={<Send className="h-5 w-5" />} />
        <KpiCard label="Produits publies" value={stats?.approvedPublications ?? 0} badge="Publies" tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Apercu du compte</CardTitle>
          <CardDescription>Informations principales de votre espace concessionnaire</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={<Building2 className="h-5 w-5" />} label="Entreprise" value={dealer.companyName} />
          <InfoCard icon={<Store className="h-5 w-5" />} label="Categorie" value={dealer.storeName} />
          <InfoCard icon={<UserRound className="h-5 w-5" />} label="Contact" value={dealer.contactPerson} />
          <InfoCard icon={<CheckCircle2 className="h-5 w-5" />} label="Statut" value={statusMeta(dealer.status).label} />
        </CardContent>
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
          <InfoCard icon={<Building2 className="h-5 w-5" />} label="Immatriculation" value={dealer.registrationNumber} />
          <InfoCard icon={<UserRound className="h-5 w-5" />} label="Personne de contact" value={dealer.contactPerson} />
          <InfoCard icon={<Mail className="h-5 w-5" />} label="E-mail" value={dealer.email} />
          <InfoCard icon={<Phone className="h-5 w-5" />} label="Telephone" value={dealer.phone} />
          <InfoCard icon={<MapPin className="h-5 w-5" />} label="Adresse" value={dealer.address} />
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
}: {
  dealer: DealerView;
  banks: BankOption[];
  partnerships: Partnership[];
  error: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Nouvelle demande</CardTitle>
          <CardDescription>Selectionnez une banque compatible avec votre categorie.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
            <FormField label="Banque partenaire *">
              <select name="bankId" required className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selectionnez une banque</option>
                {banks.map((bank) => <option key={bank.bankId} value={bank.bankId}>{bank.bankName}</option>)}
              </select>
            </FormField>
            <FormField label="Store concerne">
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-sm"><Store className="h-4 w-4 text-primary" />{dealer.storeName}</div>
            </FormField>
            <FormField label="Message">
              <textarea name="message" maxLength={1000} rows={5} placeholder="Message optionnel" className="w-full resize-none rounded-lg border border-input bg-input-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </FormField>
            <Button type="submit" className="w-full" size="lg" icon={<Send className="h-5 w-5" />} loading={submitting} disabled={banks.length === 0}>
              Envoyer la demande
            </Button>
            {banks.length === 0 && <p className="text-center text-sm text-muted-foreground">Aucune nouvelle banque compatible n'est disponible pour votre categorie.</p>}
          </form>
        </CardContent>
      </Card>

      <HistoryList
        title="Historique des partenariats"
        description="Suivez les demandes envoyees et les decisions des banques."
        emptyTitle="Aucun partenariat"
        emptyDescription="Vos demandes de partenariat apparaitront ici."
        icon={<Handshake className="h-7 w-7" />}
        rows={partnerships.map((item) => ({
          id: item.id,
          title: item.bankName,
          subtitle: `${item.storeName} - Demande du ${formatDate(item.requestDate)}`,
          status: item.status,
          detail: item.rejectionReason || item.message,
        }))}
      />
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
    <HistoryList
      title="Historique des publications"
      description="Chaque ligne correspond a un produit soumis a une banque partenaire."
      emptyTitle="Aucune publication"
      emptyDescription="Soumettez un produit actif depuis votre catalogue pour le voir ici."
      icon={<Send className="h-7 w-7" />}
      rows={publications.map((item) => ({
        id: item.id,
        title: item.product.name,
        subtitle: `${item.bankName} - ${item.storeName} - Soumis le ${formatDate(item.submittedAt)}`,
        status: item.status,
        detail: item.rejectionReason,
      }))}
    />
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

function HistoryList({ title, description, rows, emptyTitle, emptyDescription, icon }: {
  title: string;
  description: string;
  rows: Array<{ id: number; title: string; subtitle: string; status: string; detail?: string }>;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} compact />
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">{row.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{row.subtitle}</div>
                {row.detail && <div className={`mt-2 text-xs ${row.status === 'REJECTED' ? 'text-destructive' : 'text-muted-foreground'}`}>{row.detail}</div>}
              </div>
              <Badge className="w-fit shrink-0" variant={statusMeta(row.status).variant}>{statusMeta(row.status).label}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
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
