import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import {
  CheckCircle2,
  CheckCircle,
  CalendarDays,
  Clock3,
  Eye,
  Building2,
  CreditCard,
  Link2,
  Mail,
  Globe,
  Phone,
  Store,
  Package,
  UserRound,
  XCircle,
  X,
  Loader2,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { notifyNotificationsUpdated } from '../../services/notificationService';
import { RequestDto, RequestStatus, RequestType } from '../../types/apiTypes';

const requestTypeLabel: Record<RequestType, string> = {
  join: "Demande d'inscription",
  store: 'Demande de store',
  module: 'Demande de module',
  subscription: "Renouvellement d'abonnement",
};

const statusLabel: Record<RequestStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvee',
  rejected: 'Rejetee',
};

const statusVariant = (status: RequestStatus) => (
  status === 'pending' ? 'warning' : status === 'approved' ? 'success' : 'danger'
);

const formatDate = (value?: string) => (
  value ? new Date(value).toLocaleDateString('fr-FR') : '-'
);

const formatTnd = (amount?: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const getRequestTotal = (request: RequestDto) => request.totalMonthlyPrice ?? request.totalAmount;

const getBankDescription = (request: RequestDto) => request.bankDescription || request.description || null;

const getRejectModalTitle = (request?: RequestDto | null) => {
  switch (request?.requestType) {
    case 'store':
      return 'Rejeter la demande de store';
    case 'module':
      return 'Rejeter la demande de module';
    case 'subscription':
      return "Rejeter la demande de renouvellement";
    case 'join':
    default:
      return "Rejeter la demande d'inscription";
  }
};

const parseIds = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => typeof item === 'number' ? item : item?.storeId ?? item?.moduleId)
        .filter((id): id is number => typeof id === 'number');
    }
  } catch {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((id) => Number.isFinite(id));
  }
  return [];
};

const getSelectedStoresCount = (request: RequestDto) => (
  request.selectedStoreDetails?.length
  || request.storeIds?.length
  || parseIds(request.selectedStores).length
  || 0
);

const getLogoUrl = (logoUrl?: string | null) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `http://localhost:8081${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
};

const BankLogo = ({
  logoUrl,
  bankName,
  size = 'sm',
}: {
  logoUrl?: string | null;
  bankName?: string | null;
  size?: 'sm' | 'lg';
}) => {
  const [hasError, setHasError] = useState(false);
  const logoSrc = !hasError ? getLogoUrl(logoUrl) : null;
  const sizeClass = size === 'lg' ? 'h-16 w-16 rounded-xl' : 'h-12 w-12 rounded-xl';
  const iconClass = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (!logoSrc) {
    return (
      <div className={`${sizeClass} flex shrink-0 items-center justify-center border border-gray-200 bg-orange-50 text-orange-500`}>
        <Building2 className={iconClass} />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={bankName || 'Logo banque'}
      className={`${sizeClass} shrink-0 border border-gray-200 bg-white object-contain p-1`}
    onError={() => setHasError(true)}
  />
  );
};

const RequestDetailSectionTitle = ({
  icon,
  title,
  iconClassName = 'text-orange-500',
}: {
  icon: ReactNode;
  title: string;
  iconClassName?: string;
}) => (
  <div className="mb-4 flex items-center gap-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200 ${iconClassName}`}>
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
  </div>
);

const RequestDetailRow = ({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="grid grid-cols-[1fr] gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
    <div className="flex items-center gap-2 text-sm text-slate-500">
      {icon ? <span className="text-slate-400">{icon}</span> : null}
      <span>{label}</span>
    </div>
    <div className="min-w-0 text-sm font-medium text-slate-900 break-words">{value || '-'}</div>
  </div>
);

export function Requests() {
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const openedRequestFromQueryRef = useRef<number | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await requestService.getRequests();
      setRequests(response.data);
    } catch (loadError) {
      console.error('Failed to load requests:', loadError);
      setError('Impossible de charger les demandes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const requestIdParam = searchParams.get('requestId');
    if (!requestIdParam) {
      openedRequestFromQueryRef.current = null;
      return;
    }

    const requestId = Number(requestIdParam);
    if (!Number.isFinite(requestId) || openedRequestFromQueryRef.current === requestId || requests.length === 0) {
      return;
    }

    openedRequestFromQueryRef.current = requestId;
    const matchingRequest = requests.find((request) => request.id === requestId);

    if (matchingRequest) {
      void openDetails(matchingRequest);
      return;
    }

    void requestService.getRequestById(requestId)
      .then((response) => {
        setSelectedRequest(response.data);
        setIsModalOpen(true);
      })
      .catch((detailError) => {
        console.error('Failed to load request from notification:', detailError);
      });
  }, [requests, searchParams]);

  const openDetails = async (request: RequestDto) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    if (!request.id) return;

    try {
      const response = await requestService.getRequestById(request.id);
      setSelectedRequest(response.data);
    } catch (detailError) {
      console.error('Failed to load request details:', detailError);
    }
  };

  const closeDetails = () => {
    setIsModalOpen(false);
    setIsRejectModalOpen(false);
    setRejectionReason('');

    if (searchParams.has('requestId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('requestId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const groupedRequests = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending'),
    approved: requests.filter((request) => request.status === 'approved'),
    rejected: requests.filter((request) => request.status === 'rejected'),
  }), [requests]);

  const openRejectModal = (request: RequestDto) => {
    setSelectedRequest(request);
    setRejectionReason(request.rejectionReason || '');
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setRejectionReason('');
  };

  const submitRejection = async () => {
    if (!selectedRequest?.id) return;
    setActionLoadingId(selectedRequest.id);
    setError('');

    try {
      const response = await requestService.rejectRequest(selectedRequest.id, {
        rejectionReason: rejectionReason.trim() || undefined,
      });

      setRequests((prev) => prev.map((item) => item.id === selectedRequest.id ? response.data : item));
      setSelectedRequest(response.data);
      closeRejectModal();
      setIsModalOpen(false);
      notifyNotificationsUpdated();
      await loadRequests();
      toast.success('Demande rejetee. Un email de rejet a ete envoye au demandeur.');
    } catch (actionError) {
      console.error('Failed to reject request:', actionError);
      setError("Le rejet de la demande a echoue.");
      toast.error("Le rejet de la demande a echoue.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const runAction = async (request: RequestDto) => {
    if (!request.id) return;
    setActionLoadingId(request.id);
    setError('');
    try {
      const response = await requestService.approveRequest(request.id);

      setRequests((prev) => prev.map((item) => item.id === request.id ? response.data : item));
      setSelectedRequest(response.data);
      setIsModalOpen(false);
      notifyNotificationsUpdated();
      await loadRequests();
      toast.success('Demande approuvee. La banque, la marketplace et le compte utilisateur ont ete crees, puis le lien de paiement a ete envoye.');
    } catch (actionError) {
      console.error('Failed to approve request:', actionError);
      setError("L'approbation a echoue. Verifiez les informations de la demande puis reessayez.");
      toast.error("L'approbation a echoue. Verifiez les informations de la demande puis reessayez.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const RequestCard = ({ request }: { request: RequestDto }) => (
    <Card hover>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <BankLogo logoUrl={request.logoUrl} bankName={request.bankName} />
            <div className="min-w-0">
              <CardTitle className="truncate">{request.bankName || '-'}</CardTitle>
              <CardDescription className="break-all">{request.bankEmail || '-'}</CardDescription>
            </div>
          </div>
          <Badge variant={statusVariant(request.status)}>{statusLabel[request.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Contact:</span>
            <span className="text-right">{request.contactName || '-'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Marketplace:</span>
            <span>{request.marketplaceSlug || '-'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Configuration:</span>
            <span>{getSelectedStoresCount(request)} store(s)</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Total mensuel:</span>
            <span className="font-semibold">{formatTnd(getRequestTotal(request))}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Date de creation:</span>
            <span>{formatDate(request.createdAt)}</span>
          </div>
          <Button
            className="mt-3 w-full bg-orange-500 hover:bg-orange-600"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => openDetails(request)}
          >
            Voir details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderGrid = (items: RequestDto[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Chargement des demandes...
        </div>
      );
    }

    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">Aucune demande dans cette liste.</p>;
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des demandes</h1>
        <p className="text-muted-foreground">Examinez et gerez toutes les demandes</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="En attente"
          value={groupedRequests.pending.length}
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
          badge={`${groupedRequests.pending.length} demandes`}
        />
        <KpiCard
          label="Approuvées"
          value={groupedRequests.approved.length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
          badge={`${groupedRequests.approved.length} demandes`}
        />
        <KpiCard
          label="Rejetées"
          value={groupedRequests.rejected.length}
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
          badge={`${groupedRequests.rejected.length} demandes`}
        />
      </div>

      <Tabs
        tabs={[
          {
            id: 'pending',
            label: `En attente (${groupedRequests.pending.length})`,
            content: renderGrid(groupedRequests.pending),
          },
          {
            id: 'approved',
            label: `Approuvees (${groupedRequests.approved.length})`,
            content: renderGrid(groupedRequests.approved),
          },
          {
            id: 'rejected',
            label: `Rejetees (${groupedRequests.rejected.length})`,
            content: renderGrid(groupedRequests.rejected),
          },
          {
            id: 'all',
            label: 'Toutes',
            content: renderGrid(requests),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeDetails}
        size="xl"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start gap-3 border-b border-slate-100 pb-5 pr-10">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Détails de la demande</h2>
                  <Badge variant={statusVariant(selectedRequest.status)} className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                    {statusLabel[selectedRequest.status]}
                  </Badge>
                </div>
              </div>
            </div>

            {selectedRequest.rejectionReason && (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <div className="font-semibold">Motif de rejet</div>
                <div className="mt-1 leading-6">{selectedRequest.rejectionReason}</div>
              </div>
            )}

            {selectedRequest.requestType === 'subscription' ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <RequestDetailSectionTitle icon={<CreditCard className="h-5 w-5" />} title="Détails du renouvellement" iconClassName="text-orange-500" />
                <div className="grid gap-4 md:grid-cols-2">
                  <RequestDetailRow icon={<Building2 className="h-4 w-4" />} label="Banque" value={selectedRequest.bankName || '-'} />
                  <RequestDetailRow icon={<Globe className="h-4 w-4" />} label="Marketplace" value={selectedRequest.marketplaceSlug || '-'} />
                  <RequestDetailRow icon={<CreditCard className="h-4 w-4" />} label="Montant" value={formatTnd(selectedRequest.totalMonthlyPrice ?? selectedRequest.totalAmount)} />
                  <RequestDetailRow icon={<UserRound className="h-4 w-4" />} label="Contact" value={selectedRequest.contactName || '-'} />
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="text-slate-400"><Globe className="h-4 w-4" /></span>
                      <span>Description</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                      {getBankDescription(selectedRequest) || 'Demande de renouvellement envoyee par la banque.'}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <RequestDetailSectionTitle icon={<Building2 className="h-5 w-5" />} title="Informations bancaires" iconClassName="text-slate-700" />
                  <div className="mb-5 flex items-center gap-4">
                    <BankLogo logoUrl={selectedRequest.logoUrl} bankName={selectedRequest.bankName} size="lg" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">Banque</p>
                      <h4 className="mt-1 truncate text-2xl font-semibold text-slate-900">{selectedRequest.bankName || '-'}</h4>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <RequestDetailRow icon={<Building2 className="h-4 w-4" />} label="Banque" value={selectedRequest.bankName || '-'} />
                    <RequestDetailRow icon={<Globe className="h-4 w-4" />} label="Pays" value={selectedRequest.country || '-'} />
                    <RequestDetailRow icon={<Mail className="h-4 w-4" />} label="Email banque" value={selectedRequest.bankEmail || '-'} />
                    <RequestDetailRow icon={<Link2 className="h-4 w-4" />} label="Site web" value={selectedRequest.website || '-'} />
                    <RequestDetailRow icon={<CalendarDays className="h-4 w-4" />} label="Annee d'etablissement" value={selectedRequest.establishmentYear || '-'} />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="text-slate-400"><Building2 className="h-4 w-4" /></span>
                        <span>Description banque</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                        {getBankDescription(selectedRequest) || '-'}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="space-y-4">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <RequestDetailSectionTitle icon={<Mail className="h-5 w-5" />} title="Coordonnées" iconClassName="text-orange-500" />
                    <div className="space-y-4">
                      <RequestDetailRow icon={<UserRound className="h-4 w-4" />} label="Contact" value={selectedRequest.adminContactName || selectedRequest.contactName || '-'} />
                      <RequestDetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedRequest.adminContactEmail || selectedRequest.contactEmail || '-'} />
                      <RequestDetailRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={selectedRequest.adminContactPhone || selectedRequest.contactPhone || '-'} />
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <RequestDetailSectionTitle icon={<Globe className="h-5 w-5" />} title="Marketplace" iconClassName="text-blue-500" />
                    <div className="space-y-4">
                      <RequestDetailRow icon={<Link2 className="h-4 w-4" />} label="Slug" value={selectedRequest.marketplaceSlug || '-'} />
                      <RequestDetailRow icon={<Store className="h-4 w-4" />} label="Type" value={requestTypeLabel[selectedRequest.requestType]} />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="text-slate-400"><Globe className="h-4 w-4" /></span>
                          <span>Description</span>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                          {selectedRequest.marketplaceDescription || '-'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ backgroundColor: selectedRequest.primaryColor }} />
                          <span className="text-sm font-medium text-slate-700">{selectedRequest.primaryColor}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ backgroundColor: selectedRequest.secondaryColor }} />
                          <span className="text-sm font-medium text-slate-700">{selectedRequest.secondaryColor}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <RequestDetailSectionTitle icon={<Store className="h-5 w-5" />} title="Configuration sélectionnée" iconClassName="text-violet-500" />
              <div className="space-y-3">
                {(selectedRequest.selectedStoreDetails || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun detail de configuration disponible.</p>
                ) : selectedRequest.selectedStoreDetails?.map((store) => (
                  <div
                    key={store.id || store.storeId}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 ring-1 ring-slate-200">
                          <Store className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-slate-900">{store.storeName}</div>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{store.storeDescription || 'Store bancaire'}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                        {formatTnd(store.storePrice)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {store.modules.length === 0 ? (
                        <span className="text-sm text-slate-500">Aucun module choisi</span>
                      ) : store.modules.map((module) => (
                        <div
                          key={module.id || module.moduleId}
                          className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-100"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-slate-700">
                            <Package className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{module.moduleName}</span>
                          </span>
                          <span className="font-semibold text-slate-900">{formatTnd(module.modulePrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="rounded-[24px] border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="block text-base font-semibold text-orange-600">Total mensuel</span>
                  <span className="mt-1 block text-xs text-slate-500">Creee le {formatDate(selectedRequest.createdAt)}</span>
                </div>
                <strong className="text-3xl font-bold text-orange-600">{formatTnd(getRequestTotal(selectedRequest))}</strong>
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                {selectedRequest.requestType !== 'subscription' ? (
                  <Button
                    variant="success"
                    size="lg"
                    className="h-14 rounded-2xl text-base font-semibold shadow-sm"
                    icon={actionLoadingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    onClick={() => runAction(selectedRequest)}
                    disabled={actionLoadingId === selectedRequest.id}
                  >
                    Approuver
                  </Button>
                ) : null}
                <Button
                  variant="danger"
                  size="lg"
                  className={`h-14 rounded-2xl text-base font-semibold shadow-sm ${selectedRequest.requestType !== 'subscription' ? '' : 'sm:col-span-2'}`}
                  icon={actionLoadingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  onClick={() => openRejectModal(selectedRequest)}
                  disabled={actionLoadingId === selectedRequest.id}
                >
                  Rejeter
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isRejectModalOpen}
        onClose={closeRejectModal}
        title={getRejectModalTitle(selectedRequest)}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Motif de rejet (optionnel)</label>
            <textarea
              className="w-full rounded-lg border border-input bg-input-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Expliquez brièvement la raison du rejet..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={submitRejection}
              disabled={actionLoadingId === selectedRequest?.id}
              icon={actionLoadingId === selectedRequest?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            >
              Confirmer le rejet
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeRejectModal}
              disabled={actionLoadingId === selectedRequest?.id}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


