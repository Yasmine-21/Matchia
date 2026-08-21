import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Calculator, CalendarDays, Camera, ChartNoAxesColumnIncreasing, CheckCircle2, CircleCheck, CircleX, Clock3, Download, Eye, FileText, FileUp, History, Loader2, Package, Save, UserRound, WalletCards } from 'lucide-react';
import { convertToHtml } from 'mammoth';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import apiClient, { resolveApiUrl } from '../../api/apiClient';
import { financingRequestService, type ClientProfile, type FinancingDetail, type FinancingSummary, type SimulationRequest } from '../../services/financingRequestService';

const money = (value?: number) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(value || 0);
const statusClass = (status: string) => status === 'ACCEPTED' ? 'client-status-badge client-status-approved' : status === 'REJECTED' ? 'client-status-badge client-status-rejected' : status === 'DRAFT' ? 'client-status-badge client-status-draft' : 'client-status-badge client-status-pending';
const statusLabel = (status: string) => status === 'ACCEPTED' ? 'Acceptée' : status === 'REJECTED' ? 'Rejetée' : status === 'DRAFT' ? 'Brouillon' : 'En attente';

const documentMimeTypeFromFilename = (filename: string) => ({ pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', txt: 'text/plain' }[filename.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream');
const isDocxDocument = (filename: string, contentType?: string) => filename.toLowerCase().endsWith('.docx') || contentType?.includes('wordprocessingml.document') === true;

export function ClientDashboard() {
  const [data, setData] = useState<{ total: number; pending: number; accepted: number; rejected: number; recent: FinancingSummary[] } | null>(null);
  useEffect(() => { financingRequestService.dashboard().then(response => setData(response.data)).catch(console.error); }, []);
  if (!data) return <Loading />;
  return <div className="client-page">
    <div className="client-page-heading"><h1>Bonjour <span aria-hidden="true">👋</span></h1><p>Suivez vos demandes de financement en temps réel.</p></div>
    <div className="client-stat-grid">
      <StatCard type="total" icon={<ChartNoAxesColumnIncreasing />} label="Total" value={data.total} description="Toutes vos demandes" />
      <StatCard type="pending" icon={<Clock3 />} label="En attente" value={data.pending} description="En cours d’analyse" />
      <StatCard type="approved" icon={<CircleCheck />} label="Acceptées" value={data.accepted} description="Demandes approuvées" />
      <StatCard type="rejected" icon={<CircleX />} label="Rejetées" value={data.rejected} description="Demandes refusées" />
    </div>
    <RequestTable requests={data.recent} title="Demandes récentes" showAllLink />
  </div>;
}

export function ClientRequests() {
  const [requests, setRequests] = useState<FinancingSummary[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { financingRequestService.list().then(response => setRequests(response.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return <div className="client-page"><div className="client-page-heading"><h1>Mes demandes</h1><p>Retrouvez et suivez l’avancement de vos demandes de financement.</p></div><RequestTable requests={requests} title="Mes demandes de financement" /></div>;
}

export function ClientProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null); const [saving, setSaving] = useState(false); const [profilePhoto, setProfilePhoto] = useState<File | null>(null); const [photoPreview, setPhotoPreview] = useState(''); const [error, setError] = useState(''); const photoInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { financingRequestService.profile().then(response => setProfile(response.data)).catch(console.error); }, []);
  if (!profile) return <Loading />;
  const photoSource = photoPreview || resolveApiUrl(profile.contactImageUrl);
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choisissez une image JPG, PNG ou WEBP de 5 Mo maximum.'); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setProfilePhoto(file); setPhotoPreview(URL.createObjectURL(file)); setError('');
  };
  const save = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { let contactImageUrl = profile.contactImageUrl; if (profilePhoto) { const data = new FormData(); data.append('contactImage', profilePhoto); contactImageUrl = (await apiClient.post<{ contactImageUrl: string }>('/api/v1/users/upload-contact-image', data)).data.contactImageUrl; } const updated = (await financingRequestService.updateProfile({ ...profile, contactImageUrl })).data; setProfile(updated); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(''); setProfilePhoto(null); window.dispatchEvent(new Event('matchia-client-profile-updated')); } catch (requestError: any) { setError(requestError?.response?.data?.message || 'Impossible d’enregistrer les modifications.'); } finally { setSaving(false); } };
  const cancel = async () => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(''); setProfilePhoto(null); setError(''); try { setProfile((await financingRequestService.profile()).data); } catch { setError('Impossible de restaurer les informations du profil.'); } };
  return <div className="client-page client-profile-page"><div className="client-page-heading"><h1>Mon profil</h1><p>Gérez vos informations personnelles.</p></div><div className="client-profile-layout"><aside className="client-profile-summary-card"><button className="client-profile-summary-avatar" type="button" onClick={() => photoInputRef.current?.click()} aria-label="Modifier la photo de profil">{photoSource ? <img src={photoSource} alt="Photo de profil" /> : <UserRound aria-hidden="true" />}<span className="client-profile-photo-edit"><Camera aria-hidden="true" /></span></button><h2>{profile.fullName}</h2><p>Client</p><input ref={photoInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { choosePhoto(event.target.files?.[0]); event.target.value = ''; }} /><button className="client-change-photo-button" type="button" onClick={() => photoInputRef.current?.click()}><Camera aria-hidden="true" />Changer la photo</button></aside><section className="client-content-card client-profile-card"><div className="client-content-card-header"><h2 className="client-content-card-title"><span className="client-content-card-title-icon"><FileText /></span>Informations personnelles</h2></div><form className="client-profile-form" onSubmit={save}><ProfileField label="Nom complet" value={profile.fullName} onChange={fullName => setProfile({ ...profile, fullName })} /><ProfileField label="E-mail" value={profile.email} disabled /><ProfileField label="Téléphone" value={profile.phone} onChange={phone => setProfile({ ...profile, phone })} /><ProfileField label="Date de naissance" value={profile.birthDate || ''} type="date" onChange={birthDate => setProfile({ ...profile, birthDate })} /><ProfileField label="Adresse" value={profile.address} onChange={address => setProfile({ ...profile, address })} wide />{error && <p className="client-profile-error client-profile-wide" role="alert">{error}</p>}<div className="client-profile-actions client-profile-wide"><button className="client-cancel-button" disabled={saving} type="button" onClick={() => void cancel()}>Annuler</button><button className="client-primary-button" disabled={saving} type="submit"><Save aria-hidden="true" />{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button></div></form></section></div></div>;
}

export function FinancingApplicationPage() {
  const location = useLocation(); const navigate = useNavigate();
  const context = (location.state || (() => { try { const saved = sessionStorage.getItem('matchia-financing-context'); return saved ? JSON.parse(saved) : null; } catch { return null; } })()) as SimulationRequest & { productName?: string; productImageUrl?: string; storeName?: string };
  const [step, setStep] = useState(1); const [profile, setProfile] = useState<ClientProfile | null>(null); const [requirements, setRequirements] = useState<{ documentType: string; label: string; required: boolean }[]>([]); const [request, setRequest] = useState<FinancingDetail | null>(null); const [files, setFiles] = useState<Record<string, File>>({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!context?.productId || !context?.storeId) return; Promise.all([financingRequestService.profile(), financingRequestService.requirements(context.storeId)]).then(([p, r]) => { setProfile(p.data); setRequirements(r.data); }).catch(() => setError('Impossible de charger les données de la demande.')); }, [context?.productId, context?.storeId]);
  if (!context?.productId || !context?.storeId) return <ClientMessage title="Simulation requise" message="Retournez au simulateur et choisissez un produit pour continuer." />;
  const create = async () => { setBusy(true); setError(''); try { const created = (await financingRequestService.create(context)).data; for (const item of requirements) if (files[item.documentType]) await financingRequestService.upload(created.id, item.documentType, files[item.documentType]); setRequest((await financingRequestService.get(created.id)).data); setStep(4); } catch (e: any) { setError(e?.response?.data?.message || 'Impossible d’enregistrer les documents.'); } finally { setBusy(false); } };
  const submit = async () => { if (!request) return; setBusy(true); try { await financingRequestService.submit(request.id); sessionStorage.removeItem('matchia-financing-context'); navigate(`/client/financing-requests/${request.id}`); } catch (e: any) { setError(e?.response?.data?.message || 'Impossible de soumettre la demande.'); } finally { setBusy(false); } };
  const productImage = resolveApiUrl(context.productImageUrl);
  const stages = [{ icon: <UserRound />, label: 'Vos informations' }, { icon: <Calculator />, label: 'Simulation' }, { icon: <FileUp />, label: 'Documents' }, { icon: <CheckCircle2 />, label: 'Validation' }];
  return <div className="client-page client-application-page"><div className="client-page-heading"><h1>Demande de financement</h1><p>Constituez votre dossier en quelques étapes simples.</p></div><div className="client-application-steps">{stages.map((stage, index) => <div className={`client-application-step${step === index + 1 ? ' client-application-step-active' : ''}${step > index + 1 ? ' client-application-step-complete' : ''}`} key={stage.label}><span>{step > index + 1 ? <CheckCircle2 /> : stage.icon}</span><div><b>Étape {index + 1}</b><small>{stage.label}</small></div></div>)}</div>{error && <div className="client-application-error" role="alert">{error}</div>}<section className="client-content-card client-application-card">{step === 1 && <><div className="client-application-card-header"><span><UserRound /></span><div><h2>Vos informations personnelles</h2><p>Vérifiez les informations utilisées pour votre demande.</p></div></div><div className="client-application-profile"><div className="client-application-avatar">{profile?.contactImageUrl ? <img src={resolveApiUrl(profile.contactImageUrl)} alt="Profil" /> : <UserRound />}</div><div className="client-application-profile-copy"><h3>{profile?.fullName || 'Client'}</h3><p>{profile?.email}</p><p>{profile?.phone}</p><p>{profile?.address}</p></div></div><div className="client-application-actions"><button className="client-secondary-button" type="button" onClick={() => navigate('/client/profile')}>Modifier mon profil</button><button className="client-primary-button" type="button" onClick={() => setStep(2)}>Continuer <ArrowRight /></button></div></>}{step === 2 && <><div className="client-application-card-header"><span><Calculator /></span><div><h2>Produit et simulation</h2><p>Voici le résultat de votre simulation de financement.</p></div></div><div className="client-application-summary-grid"><article className="client-application-product">{productImage ? <img src={productImage} alt={context.productName || 'Produit'} /> : <span><Package /></span>}<div><small>Produit sélectionné</small><h3>{context.productName || `Produit #${context.productId}`}</h3><p>{context.storeName || 'Store de la marketplace'}</p></div></article><div className="client-application-simulation"><ApplicationValue label="Montant financé" value={money(context.requestedAmount)} /><ApplicationValue label="Apport personnel" value={money(context.downPayment)} /><ApplicationValue label="Durée" value={`${context.durationMonths || 0} mois`} /><ApplicationValue label="Mensualité" value={money(context.monthlyPayment)} /></div></div><div className="client-application-actions"><button className="client-secondary-button" type="button" onClick={() => setStep(1)}>Retour</button><button className="client-primary-button" type="button" onClick={() => setStep(3)}>Continuer <ArrowRight /></button></div></>}{step === 3 && <><div className="client-application-card-header"><span><FileUp /></span><div><h2>Documents requis</h2><p>Ajoutez les justificatifs demandés par la banque.</p></div></div><div className="client-application-documents">{requirements.map(item => <label key={item.documentType} className={`client-application-upload${files[item.documentType] ? ' client-application-upload-complete' : ''}`}><span className="client-application-upload-icon">{files[item.documentType] ? <CheckCircle2 /> : <FileText />}</span><span className="client-application-upload-copy"><b>{item.label}{item.required && <em>Obligatoire</em>}</b><small>{files[item.documentType]?.name || 'Choisir un fichier à téléverser'}</small></span><span className="client-application-upload-button">{files[item.documentType] ? 'Remplacer' : 'Parcourir'}<input type="file" onChange={event => { const file = event.target.files?.[0]; if (file) setFiles({ ...files, [item.documentType]: file }); }} /></span></label>)}</div><div className="client-application-actions"><button className="client-secondary-button" type="button" disabled={busy} onClick={() => setStep(2)}>Retour</button><button className="client-primary-button" disabled={busy || requirements.some(item => item.required && !files[item.documentType])} type="button" onClick={() => void create()}>{busy ? <Loader2 className="animate-spin" /> : <FileUp />}{busy ? 'Enregistrement...' : 'Vérifier les documents'}</button></div></>}{step === 4 && <><div className="client-application-card-header"><span><CheckCircle2 /></span><div><h2>Vérification et envoi</h2><p>Votre dossier est prêt. Confirmez l’envoi à la banque.</p></div></div><div className="client-application-confirmation"><CheckCircle2 /><div><h3>Dossier prêt à être envoyé</h3><p>{request?.productName || context.productName} · {money(request?.requestedAmount || context.requestedAmount)}</p><small>Les documents fournis seront transmis à la banque pour analyse.</small></div></div><div className="client-application-actions"><button className="client-secondary-button" type="button" disabled={busy} onClick={() => setStep(3)}>Retour</button><button className="client-primary-button" disabled={busy} type="button" onClick={() => void submit()}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{busy ? 'Envoi en cours...' : 'Soumettre la demande'}</button></div></>}</section></div>;
}

export function ClientRequestDetail() {
  const { id } = useParams(); const [request, setRequest] = useState<FinancingDetail | null>(null); const [requirements, setRequirements] = useState<{ documentType: string; label: string; required: boolean }[]>([]); const [busy, setBusy] = useState(false); const [documentBusyId, setDocumentBusyId] = useState<number | null>(null); const [documentError, setDocumentError] = useState('');
  const reload = async () => { if (!id) return; const detail = (await financingRequestService.get(Number(id))).data; setRequest(detail); setRequirements((await financingRequestService.requirements(detail.storeId)).data); };
  useEffect(() => { void reload(); }, [id]); if (!request) return <Loading />;
  const editable = request.status === 'DRAFT' || request.status === 'PENDING';
  const upload = async (type: string, file?: File) => { if (!file) return; setBusy(true); try { await financingRequestService.upload(request.id, type, file); await reload(); } finally { setBusy(false); } };
  const fetchDocument = (documentId: number) => apiClient.get<Blob>(`/api/client/financing-requests/${request.id}/documents/${documentId}/download`, { responseType: 'blob' });
  const toFileBlob = (response: { data: Blob; headers: Record<string, unknown> }, document: FinancingDetail['documents'][number]) => {
    const responseType = response.headers['content-type'];
    const declaredType = document.contentType || (typeof responseType === 'string' ? responseType : '');
    const mimeType = !declaredType || declaredType === 'application/octet-stream' ? documentMimeTypeFromFilename(document.originalFilename) : declaredType;
    return new Blob([response.data], { type: mimeType });
  };
  const previewDocument = async (document: FinancingDetail['documents'][number]) => {
    const previewWindow = window.open('', '_blank');
    setDocumentBusyId(document.id); setDocumentError('');
    try {
      const response = await fetchDocument(document.id);
      if (isDocxDocument(document.originalFilename, document.contentType)) {
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
      const response = await fetchDocument(document.id); const url = URL.createObjectURL(toFileBlob(response, document)); const link = window.document.createElement('a'); link.href = url; link.download = document.originalFilename; window.document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch { setDocumentError('Impossible de télécharger ce document.'); } finally { setDocumentBusyId(null); }
  };
  const history = [
    { label: 'Demande envoyée', date: request.createdAt, completed: true },
    { label: 'En cours d’analyse', date: request.status !== 'DRAFT' ? request.createdAt : null, completed: request.status !== 'DRAFT' },
    { label: statusLabel(request.status), date: request.processedAt, completed: request.status === 'ACCEPTED' || request.status === 'REJECTED' },
  ];
  return <div className="client-page client-detail-page">
    <div className="client-detail-heading"><Link to="/client/financing-requests" className="client-back-link"><ArrowLeft />Retour à mes demandes</Link><div className="client-detail-title-row"><h1>{request.reference}</h1><span className={statusClass(request.status)}><CheckCircle2 />{statusLabel(request.status)}</span></div><p>Détail de la demande de financement</p></div>
    <div className="client-finance-summary"><FinanceMetric icon={<ChartNoAxesColumnIncreasing />} label="Montant financé" value={money(request.requestedAmount)} type="amount" /><FinanceMetric icon={<CalendarDays />} label="Durée" value={`${request.durationMonths || 0} mois`} type="duration" /><FinanceMetric icon={<WalletCards />} label="Mensualité" value={money(request.monthlyPayment)} type="monthly" /></div>
    <div className="client-detail-two-columns"><section className="client-content-card client-product-card"><DetailCardTitle icon={<Package />} title="Produit concerné" /><div className="client-product-content">{request.productImageUrl ? <img src={assetUrl(request.productImageUrl)} alt={request.productName} /> : <div className="client-product-placeholder"><Package /></div>}<div><h2>{request.productName}</h2><p>Catégorie<br /><b>{request.storeName}</b></p><p>Prix<br /><b>{money(request.productPrice)}</b></p></div></div></section><section className="client-content-card client-simulation-card"><DetailCardTitle icon={<Calculator />} title="Simulation" /><p className="client-simulation-subtitle">Résumé du financement</p><div className="client-simulation-list"><SimulationRow label="Montant financé" value={money(request.requestedAmount)} /><SimulationRow label="Apport personnel" value={money(request.downPayment)} /><SimulationRow label="Durée" value={`${request.durationMonths || 0} mois`} /><SimulationRow label="Mensualité" value={money(request.monthlyPayment)} /></div></section></div>
    <section className="client-content-card client-documents-card"><DetailCardTitle icon={<FileText />} title="Documents fournis" />{documentError && <p className="client-document-error">{documentError}</p>}<div className="client-documents-list"><table className="client-documents-table"><thead><tr><th>Type de document</th><th>Nom du document</th><th>Action</th></tr></thead><tbody>{request.documents.map(document => <tr key={document.id}><td><span className="client-document-type">{extension(document.originalFilename)}</span></td><td className="client-document-name">{document.originalFilename}</td><td><div className="client-document-actions"><button type="button" disabled={documentBusyId === document.id} onClick={() => void previewDocument(document)}><Eye />Voir</button><button type="button" disabled={documentBusyId === document.id} onClick={() => void downloadDocument(document)}><Download />Télécharger</button></div></td></tr>)}{!request.documents.length && <tr><td colSpan={3} className="client-documents-empty">Aucun document fourni.</td></tr>}</tbody></table></div></section>
    <section className="client-content-card client-history-card"><DetailCardTitle icon={<History />} title="Historique de la demande" /><div className="client-history-line">{history.map((item, index) => <div className={`client-history-step${item.completed ? ' client-history-complete' : ''}`} key={item.label}><span className="client-history-dot">{item.completed && <CheckCircle2 />}</span><div><strong>{item.label}</strong><small>{item.date ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date)) : 'En attente'}</small></div>{index < history.length - 1 && <span className="client-history-connector" />}</div>)}</div></section>
    {editable && <section className="client-content-card client-manage-documents"><DetailCardTitle icon={<FileUp />} title="Gérer mes documents" />{requirements.map(item => <label className="client-upload-row" key={item.documentType}><span>{item.label}{item.required && ' *'}</span><input disabled={busy} type="file" onChange={event => void upload(item.documentType, event.target.files?.[0])} /></label>)}</section>}
  </div>;
}

function FinanceMetric({ icon, label, value, type }: { icon: ReactNode; label: string; value: string; type: string }) { return <article className={`client-finance-metric client-finance-${type}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>; }
function DetailCardTitle({ icon, title }: { icon: ReactNode; title: string }) { return <div className="client-detail-card-title"><span>{icon}</span><h2>{title}</h2></div>; }
function SimulationRow({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><i /><b>{value}</b></div>; }
function ApplicationValue({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function assetUrl(value: string) { return resolveApiUrl(value); }
function extension(filename: string) { const value = filename.split('.').pop()?.toUpperCase(); return value || 'FICHIER'; }
function StatCard({ type, icon, label, value, description }: { type: string; icon: ReactNode; label: string; value: number; description: string }) { return <article className={`client-stat-card client-stat-${type}`}><span className="client-stat-icon">{icon}</span><div className="client-stat-copy"><div className="client-stat-label">{label}</div><div className="client-stat-value">{value}</div><div className="client-stat-description">{description}</div></div></article>; }
function RequestTable({ requests, title, showAllLink = false }: { requests: FinancingSummary[]; title: string; showAllLink?: boolean }) { return <section className="client-content-card"><div className="client-content-card-header"><h2 className="client-content-card-title"><span className="client-content-card-title-icon"><FileText /></span>{title}</h2>{showAllLink && <Link className="client-view-all" to="/client/financing-requests">Voir toutes les demandes <ArrowRight /></Link>}</div><div className="client-table-wrapper"><table className="client-request-table"><thead><tr><th>Référence</th><th>Produit</th><th>Montant</th><th>Statut</th><th>Action</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td className="client-request-reference">{request.reference}</td><td>{request.productName}</td><td>{money(request.requestedAmount)}</td><td><span className={statusClass(request.status)}>{statusLabel(request.status)}</span></td><td><Link className="client-request-action" to={`/client/financing-requests/${request.id}`}>Voir <ArrowRight /></Link></td></tr>)}{!requests.length && <tr><td className="client-empty-table" colSpan={5}>Aucune demande pour le moment.</td></tr>}</tbody></table></div></section>; }
export function RequestDetail({ request, client = false, onProcess }: { request: FinancingDetail; client?: boolean; onProcess?: () => void }) {
  const [documentBusyId, setDocumentBusyId] = useState<number | null>(null);
  const [documentError, setDocumentError] = useState('');
  const documentUrl = (documentId: number) => client
    ? `/api/client/financing-requests/${request.id}/documents/${documentId}/download`
    : financingRequestService.bankDocumentUrl(request.id, documentId);
  const fetchDocument = (documentId: number) => apiClient.get<Blob>(documentUrl(documentId), { responseType: 'blob' });
  const fileBlob = (response: { data: Blob; headers: Record<string, unknown> }, document: FinancingDetail['documents'][number]) => {
    const responseType = response.headers['content-type'];
    return new Blob([response.data], { type: document.contentType || (typeof responseType === 'string' ? responseType : 'application/octet-stream') });
  };
  const previewDocument = async (document: FinancingDetail['documents'][number]) => {
    const previewWindow = window.open('', '_blank');
    setDocumentBusyId(document.id); setDocumentError('');
    try {
      const response = await fetchDocument(document.id);
      const url = URL.createObjectURL(fileBlob(response, document));
      if (previewWindow) previewWindow.location.href = url;
      else { const link = window.document.createElement('a'); link.href = url; link.target = '_blank'; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { previewWindow?.close(); setDocumentError('Impossible d’ouvrir ce document.'); } finally { setDocumentBusyId(null); }
  };
  const downloadDocument = async (document: FinancingDetail['documents'][number]) => {
    setDocumentBusyId(document.id); setDocumentError('');
    try {
      const response = await fetchDocument(document.id);
      const url = URL.createObjectURL(fileBlob(response, document));
      const link = window.document.createElement('a'); link.href = url; link.download = document.originalFilename; window.document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch { setDocumentError('Impossible de télécharger ce document.'); } finally { setDocumentBusyId(null); }
  };

  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{request.reference}</CardTitle><span className={statusClass(request.status)}>{statusLabel(request.status)}</span></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-semibold">Produit</h3><p>{request.productName}</p><p className="text-muted-foreground">{request.storeName} · {money(request.productPrice)}</p></div><div><h3 className="font-semibold">Simulation</h3><p>{money(request.requestedAmount)} sur {request.durationMonths} mois</p><p className="text-muted-foreground">Mensualité {money(request.monthlyPayment)}</p></div></div>{!client && <div><h3 className="font-semibold">Client</h3><p>{request.client.fullName} · {request.client.email} · {request.client.phone}</p></div>}{request.rejectionReason && <div className="rounded-lg bg-rose-50 p-3 text-rose-700"><b>Motif de rejet :</b> {request.rejectionReason}</div>}<div><h3 className="mb-2 font-semibold">Documents</h3>{documentError && <p className="mb-2 text-sm text-destructive">{documentError}</p>}<div className="space-y-2">{request.documents.map(document => <div className="flex items-center gap-2" key={document.id}><span className="min-w-0 flex-1 truncate">{document.originalFilename}</span><Button variant="outline" size="sm" disabled={documentBusyId === document.id} onClick={() => void previewDocument(document)}><Eye className="mr-1 h-4 w-4" />Voir</Button><Button variant="outline" size="sm" disabled={documentBusyId === document.id} onClick={() => void downloadDocument(document)}><Download className="mr-1 h-4 w-4" />Télécharger</Button></div>)}</div></div>{onProcess && request.status === 'PENDING' && <Button onClick={onProcess}>Traiter la demande</Button>}</CardContent></Card>;
}
function ProfileField({ label, value, onChange, type = 'text', disabled, wide = false }: { label: string; value?: string | null; onChange?: (value: string) => void; type?: string; disabled?: boolean; wide?: boolean }) { return <div className={`client-profile-field${wide ? ' client-profile-wide' : ''}`}><label>{label}</label><input type={type} value={value || ''} disabled={disabled} onChange={event => onChange?.(event.target.value)} /></div>; }
function ClientMessage({ title, message }: { title: string; message: string }) { return <div className="client-page"><div className="client-page-heading"><h1>{title}</h1><p>{message}</p></div></div>; }
const Loading = () => <div className="client-loading"><Loader2 />Chargement...</div>;
