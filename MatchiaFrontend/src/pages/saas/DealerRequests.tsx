import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  Store,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { dealerService, DealerRequest, RequestStatus } from '../../services/dealerService';
import { storeService } from '../../services/storeService';
import type { StoreDto } from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';

const statusMeta: Record<RequestStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  APPROVED: { label: 'Approuvee', variant: 'success' },
  REJECTED: { label: 'Rejetee', variant: 'danger' },
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.detail || data?.message || data?.error || fallback;
};

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '-';

export function DealerRequests() {
  const [requests, setRequests] = useState<DealerRequest[]>([]);
  const [selected, setSelected] = useState<DealerRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DealerRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [loadingDocument, setLoadingDocument] = useState('');

  const pageCounts = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'PENDING').length,
    approved: requests.filter((request) => request.status === 'APPROVED').length,
    rejected: requests.filter((request) => request.status === 'REJECTED').length,
  }), [requests]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await dealerService.getSaasRequests({
        search,
        status: status || undefined,
        storeId: storeId || undefined,
        from: from ? `${from}T00:00:00` : undefined,
        to: to ? `${to}T23:59:59` : undefined,
        page,
        size: 20,
        sort: 'submittedAt,desc',
      });
      setRequests(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger les demandes concessionnaires.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void storeService.getAllStores()
      .then(({ data }) => setStores(data))
      .catch((error) => console.error('Store loading failed:', error));
  }, []);

  useEffect(() => {
    void load();
  }, [status, storeId, from, to, page]);

  const approve = async (request: DealerRequest) => {
    if (!window.confirm(`Approuver ${request.companyName} ?`)) return;
    setActionLoadingId(request.id);
    try {
      await dealerService.approveRequest(request.id);
      toast.success('Demande concessionnaire approuvee.');
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "L'approbation de la demande a echoue."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (request: DealerRequest) => {
    setSelected(null);
    setRejectTarget(request);
    setRejectionReason('');
  };

  const reject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) {
      toast.error('Le motif du rejet est obligatoire.');
      return;
    }
    setActionLoadingId(rejectTarget.id);
    try {
      await dealerService.rejectRequest(rejectTarget.id, rejectionReason.trim());
      toast.success('Demande concessionnaire rejetee.');
      setRejectTarget(null);
      setRejectionReason('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Le rejet de la demande a echoue.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDocument = async (requestId: number, documentIndex: number) => {
    const documentKey = `${requestId}-${documentIndex}`;
    const documentWindow = window.open('about:blank', '_blank');
    if (documentWindow) {
      documentWindow.opener = null;
      documentWindow.document.title = 'Chargement du document';
      documentWindow.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:24px">Chargement du document...</p>';
    }

    setLoadingDocument(documentKey);
    try {
      const response = await dealerService.getRequestDocument(requestId, documentIndex);
      const objectUrl = URL.createObjectURL(response.data);

      if (documentWindow) {
        documentWindow.location.replace(objectUrl);
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      documentWindow?.close();
      let message = getErrorMessage(error, "Impossible d'ouvrir le document.");
      const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;
      if (responseData instanceof Blob) {
        try {
          const parsed = JSON.parse(await responseData.text());
          message = parsed.detail || parsed.message || parsed.error || message;
        } catch {
          // Keep the user-friendly fallback for a non-JSON error body.
        }
      }
      toast.error(message);
    } finally {
      setLoadingDocument('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Gestion des partenaires</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Concessionnaires</h1>
        <p className="mt-2 text-muted-foreground">
          Consultez et traitez les demandes d'inscription des concessionnaires.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Demandes trouvees"
          value={totalElements}
          badge="Dossiers"
          tone="primary"
          icon={<UsersRound className="h-5 w-5" />}
        />
        <KpiCard
          label="En attente "
          value={pageCounts.pending}
          badge="A traiter"
          tone="warning"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <KpiCard
          label="Approuvees "
          value={pageCounts.approved}
          badge="Validees"
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Rejetees "
          value={pageCounts.rejected}
          badge="Refusees"
          tone="danger"
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Filtres de recherche</h2>
            
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <label className="space-y-2 text-sm font-medium text-foreground">
            Recherche
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setPage(0);
                    void load();
                  }
                }}
                placeholder="Entreprise, contact, e-mail..."
                className="h-11 w-full rounded-lg border border-input bg-input-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </label>
          <FilterSelect label="Statut" value={status} onChange={(value) => { setStatus(value); setPage(0); }}>
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvee</option>
            <option value="REJECTED">Rejetee</option>
          </FilterSelect>
          <FilterSelect label="Store" value={storeId} onChange={(value) => { setStoreId(value); setPage(0); }}>
            <option value="">Tous les stores</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </FilterSelect>
          <DateFilter label="Du" value={from} onChange={(value) => { setFrom(value); setPage(0); }} />
          <DateFilter label="Au" value={to} onChange={(value) => { setTo(value); setPage(0); }} />
          <Button className="h-11" icon={<Search className="h-4 w-4" />} onClick={() => { setPage(0); void load(); }}>
            Rechercher
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Liste des demandes</h2>
            
          </div>
         
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Concessionnaire</th>
                <th className="px-4 py-4">Store</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Soumission</th>
                <th className="px-4 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && requests.map((request) => (
                <tr key={request.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <DealerLogo request={request} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-foreground">{request.companyName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{request.registrationNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Badge variant="outline">{request.storeName}</Badge></td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">{request.contactPerson}</div>
                    <div className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground">{request.email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(request.submittedAt)}</td>
                  <td className="px-4 py-4">
                    <Badge variant={statusMeta[request.status].variant}>{statusMeta[request.status].label}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setSelected(request)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Chargement des demandes...
          </div>
        )}
        {!loading && requests.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">Aucune demande trouvee</h3>
            <p className="mt-1 text-sm text-muted-foreground">Modifiez les filtres pour afficher davantage de resultats.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Page {page + 1} sur {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                Precedent
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 border-b border-border pb-5 pr-10">
              <DealerLogo request={selected} large />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">{selected.companyName}</h2>
                  <Badge variant={statusMeta[selected.status].variant}>{statusMeta[selected.status].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Dossier concessionnaire - {selected.registrationNumber}</p>
              </div>
            </div>

            {selected.rejectionReason && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="font-semibold">Motif du rejet</div>
                <p className="mt-1">{selected.rejectionReason}</p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Informations professionnelles" icon={<Building2 className="h-5 w-5" />}>
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Immatriculation" value={selected.registrationNumber} />
                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Adresse" value={selected.address} />
                <DetailRow icon={<Store className="h-4 w-4" />} label="Store" value={selected.storeName} />
                <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Soumise le" value={formatDate(selected.submittedAt)} />
              </DetailSection>
              <DetailSection title="Coordonnees" icon={<UserRound className="h-5 w-5" />}>
                <DetailRow icon={<UserRound className="h-4 w-4" />} label="Contact" value={selected.contactPerson} />
                <DetailRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={selected.email} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Telephone" value={selected.phone} />
                <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Traitee le" value={formatDate(selected.processedAt)} />
              </DetailSection>
            </div>

            <DetailSection title="Documents justificatifs" icon={<FileText className="h-5 w-5" />}>
              {selected.documentUrls.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.documentUrls.map((url, index) => {
                    const documentKey = `${selected.id}-${index}`;
                    const isDocumentLoading = loadingDocument === documentKey;
                    return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      disabled={Boolean(loadingDocument)}
                      onClick={() => void openDocument(selected.id, index)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        {isDocumentLoading
                          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          : <FileText className="h-4 w-4" />}
                      </span>
                      {isDocumentLoading ? 'Ouverture en cours...' : `Document ${index + 1}`}
                    </button>
                    );
                  })}
                </div>
              )}
            </DetailSection>

            {selected.status === 'PENDING' && (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <Button
                  variant="danger"
                  size="lg"
                  icon={<XCircle className="h-5 w-5" />}
                  disabled={actionLoadingId === selected.id}
                  onClick={() => openRejectModal(selected)}
                >
                  Rejeter
                </Button>
                <Button
                  variant="success"
                  size="lg"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  loading={actionLoadingId === selected.id}
                  onClick={() => void approve(selected)}
                >
                  Approuver
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Rejeter la demande" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Precisez le motif du rejet de la demande de <strong className="text-foreground">{rejectTarget?.companyName}</strong>.
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
            <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={actionLoadingId === rejectTarget?.id}
              onClick={() => void reject()}
            >
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DealerLogo({ request, large = false }: { request: DealerRequest; large?: boolean }) {
  const size = large ? 'h-16 w-16 rounded-2xl' : 'h-11 w-11 rounded-xl';
  if (request.logoUrl) {
    return <img src={getBackendAssetUrl(request.logoUrl)} alt={`Logo ${request.companyName}`} className={`${size} shrink-0 border border-border bg-white object-contain p-1`} />;
  }
  return <span className={`${size} flex shrink-0 items-center justify-center bg-primary/10 text-primary`}><Building2 className={large ? 'h-7 w-7' : 'h-5 w-5'} /></span>;
}

function FilterSelect({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-foreground">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
        {children}
      </select>
    </label>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-medium text-foreground">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
        <span className="text-primary">{icon}</span>{title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-words font-medium text-foreground">{value || '-'}</div>
      </div>
    </div>
  );
}
