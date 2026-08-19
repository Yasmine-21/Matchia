import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock3, Download, Eye, FileText, Loader2, Search, UserRound, XCircle } from 'lucide-react';
import { convertToHtml } from 'mammoth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { KpiCard } from '../../components/ui/KpiCard';
import apiClient from '../../api/apiClient';
import { useBankTenant } from '../../hooks/useBankTenant';
import { financingRequestService, type FinancingDetail, type FinancingSummary } from '../../services/financingRequestService';
import { getBackendAssetUrl } from '../../utils/tenant';

const statusLabel = (status: string) => status === 'ACCEPTED' ? 'Acceptée' : status === 'REJECTED' ? 'Rejetée' : status === 'DRAFT' ? 'Brouillon' : 'En attente';
const statusVariant = (status: string) => status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'danger' : status === 'DRAFT' ? 'secondary' : 'warning';
const formatAmount = (value?: number) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 }).format(value || 0);
const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
const mimeTypeFromFilename = (filename: string) => ({ pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', txt: 'text/plain' }[filename.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream');
const isDocx = (filename: string, contentType?: string) => filename.toLowerCase().endsWith('.docx') || contentType?.includes('wordprocessingml.document') === true;
const documentTypeLabel = (filename: string) => filename.split('.').pop()?.toUpperCase() || 'FICHIER';

export function BankFinancingRequests() {
  const { stores } = useBankTenant();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<FinancingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId && stores.length) setStoreId(stores[0].storeId ?? stores[0].id);
  }, [stores, storeId]);

  useEffect(() => {
    if (!storeId) return;
    setIsLoading(true); setError('');
    financingRequestService.bankRequests(storeId, status, search)
      .then((response) => setRequests(response.data))
      .catch(() => { setRequests([]); setError('Impossible de charger les demandes de financement.'); })
      .finally(() => setIsLoading(false));
  }, [storeId, status, search]);

  const pendingCount = requests.filter((request) => request.status === 'PENDING').length;
  const acceptedCount = requests.filter((request) => request.status === 'ACCEPTED').length;
  const rejectedCount = requests.filter((request) => request.status === 'REJECTED').length;

  return <div className="w-full space-y-6">
    <div className="mb-6 flex items-center justify-between gap-4">
      <div><h1 className="mb-2 text-3xl font-bold">Demandes de financement</h1><p className="text-muted-foreground">Consultez et traitez les dossiers soumis par vos clients.</p></div>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <KpiCard label="Total des demandes" value={requests.length} icon={<FileText className="h-5 w-5" />} tone="primary" badge={`${requests.length} dossier${requests.length !== 1 ? 's' : ''}`} />
      <KpiCard label="En attente" value={pendingCount} icon={<Clock3 className="h-5 w-5" />} tone="warning" badge={`${pendingCount} à traiter`} />
      <KpiCard label="Acceptées" value={acceptedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" badge={`${acceptedCount} approuvée${acceptedCount !== 1 ? 's' : ''}`} />
      <KpiCard label="Rejetées" value={rejectedCount} icon={<XCircle className="h-5 w-5" />} tone="danger" badge={`${rejectedCount} refusée${rejectedCount !== 1 ? 's' : ''}`} />
    </div>

    <Card className="mb-6"><CardHeader><CardTitle>Filtres</CardTitle><CardDescription>Affinez les dossiers par store, statut ou recherche.</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
      <div><label className="mb-2 block text-sm text-foreground">Store</label><select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring" value={storeId || ''} onChange={(event) => setStoreId(Number(event.target.value))}>
        {stores.filter((store) => store.enabled !== false && store.visible !== false).map((store) => <option key={store.id} value={store.storeId ?? store.id}>{store.name || `Store ${store.storeId ?? store.id}`}</option>)}
      </select></div>
      <div><label className="mb-2 block text-sm text-foreground">Statut</label><select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option><option value="PENDING">En attente</option><option value="ACCEPTED">Acceptée</option><option value="REJECTED">Rejetée</option></select></div>
      <Input label="Rechercher" className="h-10" icon={<Search className="h-4 w-4" />} placeholder="Client, produit ou référence..." value={search} onChange={(event) => setSearch(event.target.value)} />
    </div></CardContent></Card>

    <Card><CardHeader><CardTitle>Liste des demandes</CardTitle><CardDescription>Toutes les demandes de financement du store sélectionné.</CardDescription></CardHeader><CardContent>
      {isLoading ? <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des demandes...</div> : error ? <div className="py-8 text-center text-destructive">{error}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="border-b border-border"><th className="px-4 py-3 text-left">Référence</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Produit</th><th className="px-4 py-3 text-left">Montant</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>
        {requests.map((request) => <tr className="border-b border-border hover:bg-muted/50" key={request.id}><td className="px-4 py-3 font-medium">{request.reference}</td><td className="px-4 py-3">{request.clientName}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"><ProductThumbnail imageUrl={request.productImageUrl} productName={request.productName} /></span><span className="font-medium">{request.productName}</span></span></td><td className="px-4 py-3 font-medium">{formatAmount(request.requestedAmount)}</td><td className="px-4 py-3"><Badge variant={statusVariant(request.status)}><span className="inline-flex items-center gap-1">{request.status === 'ACCEPTED' ? <CheckCircle2 className="h-3 w-3" /> : request.status === 'REJECTED' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{statusLabel(request.status)}</span></Badge></td><td className="px-4 py-3"><div className="flex justify-end"><Link className="rounded-lg p-2 text-primary transition-colors hover:bg-muted" title="Voir le dossier" to={`/bank/financing-requests/${request.id}`}><Eye className="h-4 w-4" /></Link></div></td></tr>)}
        {!requests.length && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Aucune demande de financement trouvée.</td></tr>}
      </tbody></table></div>}
    </CardContent></Card>
  </div>;
}

function BankRequestOverview({ request }: { request: FinancingDetail }) {
  const [documentBusyId, setDocumentBusyId] = useState<number | null>(null);
  const [documentError, setDocumentError] = useState('');
  const fetchDocument = (documentId: number) => apiClient.get<Blob>(financingRequestService.bankDocumentUrl(request.id, documentId), { responseType: 'blob' });
  const toFileBlob = (response: { data: Blob; headers: Record<string, unknown> }, document: FinancingDetail['documents'][number]) => {
    const responseType = response.headers['content-type'];
    const declaredType = document.contentType || (typeof responseType === 'string' ? responseType : '');
    const mimeType = !declaredType || declaredType === 'application/octet-stream' ? mimeTypeFromFilename(document.originalFilename) : declaredType;
    return new Blob([response.data], { type: mimeType });
  };
  const previewDocument = async (document: FinancingDetail['documents'][number]) => {
    const previewWindow = window.open('', '_blank');
    setDocumentBusyId(document.id); setDocumentError('');
    try {
      const response = await fetchDocument(document.id);
      if (isDocx(document.originalFilename, document.contentType)) {
        const preview = await convertToHtml({ arrayBuffer: await response.data.arrayBuffer() });
        if (!previewWindow) throw new Error('Preview blocked');
        previewWindow.document.open();
        previewWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Prévisualisation du document</title><style>body{max-width:900px;margin:40px auto;padding:0 24px;color:#172554;font:16px/1.65 Arial,sans-serif}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:8px}h1,h2,h3{color:#0f172a}</style></head><body>${preview.value || '<p>Ce document ne contient aucun contenu affichable.</p>'}</body></html>`);
        previewWindow.document.close();
        return;
      }
      const url = URL.createObjectURL(toFileBlob(response, document));
      if (previewWindow) previewWindow.location.replace(url);
      else { const link = window.document.createElement('a'); link.href = url; link.target = '_blank'; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { previewWindow?.close(); setDocumentError('Impossible d’ouvrir ce document.'); } finally { setDocumentBusyId(null); }
  };
  const downloadDocument = async (document: FinancingDetail['documents'][number]) => {
    setDocumentBusyId(document.id); setDocumentError('');
    try {
      const response = await fetchDocument(document.id); const url = URL.createObjectURL(toFileBlob(response, document));
      const link = window.document.createElement('a'); link.href = url; link.download = document.originalFilename; window.document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch { setDocumentError('Impossible de télécharger ce document.'); } finally { setDocumentBusyId(null); }
  };

  return <div className="space-y-6">
    <div><Link className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" to="/bank/financing-requests"><ArrowLeft className="h-4 w-4" />Retour aux demandes</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{request.reference}</h1><Badge variant={statusVariant(request.status)}><span className="inline-flex items-center gap-1">{request.status === 'ACCEPTED' ? <CheckCircle2 className="h-3 w-3" /> : request.status === 'REJECTED' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{statusLabel(request.status)}</span></Badge></div><p className="mt-2 text-muted-foreground">Détail de la demande de financement</p></div>

    <div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><UserRound className="h-4 w-4" /></span>Informations client</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><DetailValue label="Nom complet" value={request.client.fullName} /><DetailValue label="E-mail" value={request.client.email} /><DetailValue label="Téléphone" value={request.client.phone} /><DetailValue label="Adresse" value={request.client.address} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-secondary/10 p-2 text-secondary"><FileText className="h-4 w-4" /></span>Produit et simulation</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3 sm:col-span-2"><span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"><ProductThumbnail imageUrl={request.productImageUrl} productName={request.productName} /></span><div><p className="text-xs text-muted-foreground">Produit concerné</p><p className="mt-1 font-semibold">{request.productName}</p><p className="mt-1 text-sm text-muted-foreground">{request.storeName}</p></div></div><DetailValue label="Prix du produit" value={formatAmount(request.productPrice)} /><DetailValue label="Apport personnel" value={formatAmount(request.downPayment)} /><DetailValue label="Taux annuel" value={request.annualRate ? `${request.annualRate}%` : '-'} /><DetailValue label="Créée le" value={formatDateTime(request.createdAt)} /></CardContent></Card></div>

    {request.rejectionReason && <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-6"><h2 className="font-semibold text-destructive">Motif de rejet</h2><p className="mt-2 text-sm text-destructive">{request.rejectionReason}</p></CardContent></Card>}

    <Card><CardHeader className="pb-4"><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-4 w-4" /></span>Documents fournis</CardTitle></CardHeader><CardContent>{documentError && <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{documentError}</div>}<div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[650px] text-sm"><thead className="bg-muted/50"><tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground"><th className="px-4 py-3">Type de document</th><th className="px-4 py-3">Nom du document</th><th className="w-[220px] px-4 py-3">Action</th></tr></thead><tbody>{request.documents.map(document => <tr className="border-b border-border last:border-0" key={document.id}><td className="px-4 py-3"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{documentTypeLabel(document.originalFilename)}</span></td><td className="px-4 py-3 font-medium text-foreground">{document.originalFilename}</td><td className="px-4 py-3"><div className="flex items-center justify-start gap-7"><button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={documentBusyId === document.id} onClick={() => void previewDocument(document)}><Eye className="h-3.5 w-3.5" />Voir</button><button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={documentBusyId === document.id} onClick={() => void downloadDocument(document)}><Download className="h-3.5 w-3.5" />Télécharger</button></div></td></tr>)}{!request.documents.length && <tr><td colSpan={3} className="py-8 text-center text-sm text-muted-foreground">Aucun document n’a été fourni pour cette demande.</td></tr>}</tbody></table></div></CardContent></Card>
  </div>;
}

function DetailValue({ label, value }: { label: string; value?: string | number | null }) { return <div className="rounded-lg bg-muted/50 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value || '-'}</p></div>; }

function ProductThumbnail({ imageUrl, productName }: { imageUrl?: string; productName: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!imageUrl || imageFailed) return <FileText className="h-4 w-4 text-muted-foreground" />;
  return <img className="h-full w-full object-cover" src={getBackendAssetUrl(imageUrl)} alt={productName} onError={() => setImageFailed(true)} />;
}

export function BankFinancingRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<FinancingDetail | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { if (id) financingRequestService.bankRequest(Number(id)).then((response) => setRequest(response.data)).catch(console.error); }, [id]);
  if (!request) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement de la demande...</div>;
  const process = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (isProcessing || request.status !== 'PENDING') return;
    setIsProcessing(true); setError('');
    try { setRequest((await financingRequestService.process(request.id, status, undefined, reason)).data); }
    catch (err: any) { setError(err?.response?.data?.message || 'Traitement impossible.'); }
    finally { setIsProcessing(false); }
  };

  return <div className="w-full space-y-6"><BankRequestOverview request={request} />
    {request.status === 'PENDING' && <Card><CardHeader><CardTitle>Traiter la demande</CardTitle><CardDescription>Choisissez une décision après vérification du dossier.</CardDescription></CardHeader><CardContent className="space-y-4">
      {error && <div className="text-destructive">{error}</div>}
      <div><label className="mb-2 block text-sm font-medium">Motif en cas de rejet</label><textarea className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Saisissez le motif en cas de rejet" value={reason} onChange={(event) => setReason(event.target.value)} disabled={isProcessing} /></div>
      <div className="flex gap-3"><Button variant="success" disabled={isProcessing} onClick={() => void process('ACCEPTED')}>{isProcessing ? 'Traitement...' : 'Accepter'}</Button><Button variant="danger" disabled={isProcessing || !reason.trim()} onClick={() => void process('REJECTED')}>Rejeter</Button></div>
    </CardContent></Card>}
    <Button variant="outline" onClick={() => navigate('/bank/financing-requests')}>Retour aux demandes</Button>
  </div>;
}
