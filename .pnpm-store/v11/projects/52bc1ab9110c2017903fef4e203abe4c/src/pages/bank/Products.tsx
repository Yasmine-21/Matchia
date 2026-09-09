import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { resolveApiUrl } from '../../api/apiClient';
import { dealerService, type Publication, type PublicationStatus } from '../../services/dealerService';
import { Building2, CalendarDays, CarFront, Eye, Image as ImageIcon, Loader2, Package, RefreshCcw, ShieldCheck, Store, Tag, Users } from 'lucide-react';

const publicationStatus: Record<PublicationStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'secondary' }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  APPROVED: { label: 'Approuvé', variant: 'success' },
  REJECTED: { label: 'Refusé', variant: 'danger' },
  INACTIVE: { label: 'Inactif', variant: 'secondary' },
};

const formatTnd = (value?: number | null) => new Intl.NumberFormat('fr-TN', {
  style: 'currency', currency: 'TND', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value ?? 0);

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' }).format(new Date(value))
  : '-';

export function BankProducts() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const loadPublications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dealerService.bankPublications();
      setPublications(response.data || []);
    } catch (loadError) {
      console.error('Failed to load dealer product publications:', loadError);
      setError('Impossible de charger les produits soumis par les concessionnaires.');
      setPublications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadPublications(); }, []);

  const stores = useMemo(() => {
    const uniqueStores = new Map<number, string>();
    publications.forEach((publication) => uniqueStores.set(publication.storeId, publication.storeName));
    return [...uniqueStores.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [publications]);

  const visiblePublications = useMemo(() => publications
    .filter((publication) => selectedStoreId === 'all' || publication.storeId === Number(selectedStoreId))
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')),
  [publications, selectedStoreId]);

  const stats = useMemo(() => [
    { label: 'Produits soumis', value: publications.length, icon: <Package className="h-5 w-5" />, tone: 'primary' as const },
    { label: 'En attente', value: publications.filter((item) => item.status === 'PENDING').length, icon: <RefreshCcw className="h-5 w-5" />, tone: 'warning' as const },
    { label: 'Approuvés', value: publications.filter((item) => item.status === 'APPROVED').length, icon: <Package className="h-5 w-5" />, tone: 'success' as const },
    { label: 'Concessionnaires', value: new Set(publications.map((item) => item.dealerId)).size, icon: <Users className="h-5 w-5" />, tone: 'primary' as const },
  ], [publications]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h1 className="mb-2 text-3xl font-bold">Produits des concessionnaires</h1><p className="text-muted-foreground">Consultez les produits soumis par les concessionnaires partenaires pour votre marketplace.</p></div>
      <Button variant="outline" icon={<RefreshCcw className="h-4 w-4" />} onClick={() => void loadPublications()} disabled={isLoading}>Actualiser</Button>
    </div>

    {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <KpiCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />)}</div>

    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><CardTitle>Produits soumis</CardTitle><CardDescription>Seuls les produits transmis à votre banque par des concessionnaires sont affichés ici.</CardDescription></div>
        <div className="w-full lg:w-80"><Select label="Filtrer par store" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)} options={[{ value: 'all', label: 'Tous les stores' }, ...stores.map((store) => ({ value: String(store.id), label: store.name }))]} /></div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des produits...</div> : visiblePublications.length === 0 ? <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">Aucun produit soumis par un concessionnaire n&apos;est disponible pour ce filtre.</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visiblePublications.map((publication) => <ProductCard key={publication.id} publication={publication} onShowDetails={() => setSelectedPublication(publication)} />)}
        </div>}
      </CardContent>
    </Card>

    <Modal isOpen={Boolean(selectedPublication)} onClose={() => setSelectedPublication(null)} title={selectedPublication?.product.name || 'Détails du produit'} size="xl">
      {selectedPublication && <ProductDetails publication={selectedPublication} />}
    </Modal>
  </div>;
}

function ProductCard({ publication, onShowDetails }: { publication: Publication; onShowDetails: () => void }) {
  const product = publication.product;
  const imageUrl = resolveApiUrl(product.imageUrl);
  const status = publicationStatus[publication.status];
  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 p-3">
      {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-white/80"><ImageIcon className="h-12 w-12" /></div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4"><h3 className="truncate text-xl font-semibold text-white">{product.name}</h3><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary" className="bg-white/10 text-white">{publication.storeName}</Badge><Badge variant={status.variant}>{status.label}</Badge></div></div>
    </div>
    <div className="flex flex-1 flex-col gap-4 p-5"><p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{product.description || 'Aucune description fournie pour ce produit.'}</p><div className="grid grid-cols-2 gap-3 text-sm"><div><div className="text-muted-foreground">Concessionnaire</div><div className="mt-1 truncate font-semibold">{publication.dealerName}</div></div><div><div className="text-muted-foreground">Prix</div><div className="mt-1 font-semibold">{formatTnd(product.price)}</div></div></div><Button variant="outline" className="mt-auto w-full" icon={<Eye className="h-4 w-4" />} onClick={onShowDetails}>Voir les détails</Button></div>
  </article>;
}

function ProductDetails({ publication }: { publication: Publication }) {
  const { product } = publication;
  const imageUrl = resolveApiUrl(product.imageUrl);
  const status = publicationStatus[publication.status];
  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-border bg-slate-50 p-5">{imageUrl ? <img src={imageUrl} alt={product.name} className="h-64 w-full object-contain" /> : <div className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-900 text-white/80"><ImageIcon className="h-12 w-12" /></div>}</div>
      <div className="rounded-2xl border border-border bg-card p-5"><Badge variant={status.variant} className="rounded-full px-3 py-1">{status.label}</Badge><h3 className="mt-4 text-2xl font-bold text-foreground">{product.name}</h3><p className="mt-2 min-h-5 text-sm text-muted-foreground">{product.description || 'Aucune description fournie pour ce produit.'}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><SummaryDetail icon={<Building2 className="h-4 w-4" />} label="Concessionnaire" value={publication.dealerName} /><SummaryDetail icon={<Store className="h-4 w-4" />} label="Store" value={publication.storeName} /><SummaryDetail icon={<Tag className="h-4 w-4" />} label="Prix" value={formatTnd(product.price)} /><SummaryDetail icon={<CalendarDays className="h-4 w-4" />} label="Soumis le" value={formatDate(publication.submittedAt)} /></div></div>
    </div>
    <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div><div className="text-base font-semibold">Conditions d&apos;éligibilité</div></div><p className="mt-3 whitespace-pre-wrap pl-12 text-sm text-muted-foreground">{product.eligibilityConditions || 'Aucune condition d’éligibilité renseignée.'}</p></section>
    <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CarFront className="h-5 w-5" /></div><div className="text-base font-semibold">Caractéristiques</div></div>{product.parameterValues?.length ? <div className="grid gap-3 md:grid-cols-2">{product.parameterValues.map((parameter) => <ProductCharacteristic key={parameter.definitionId} label={parameter.name || 'Caractéristique'} value={parameter.value || '-'} />)}</div> : <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">Aucune caractéristique renseignée.</div>}</section>
  </div>;
}

function SummaryDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">{icon}</div><div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 truncate text-sm font-semibold">{value}</div></div></div>;
}

function ProductCharacteristic({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="truncate font-semibold text-foreground">{value}</span></div>;
}
