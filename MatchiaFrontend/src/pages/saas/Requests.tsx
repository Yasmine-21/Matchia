import { useEffect, useMemo, useRef, useState } from 'react';
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
  Clock3,
  Eye,
  Building2,
  CreditCard,
  Mail,
  Globe,
  Palette,
  Store,
  Package,
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
        title="Details de la demande"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(selectedRequest.status)}>
                  {statusLabel[selectedRequest.status]}
                </Badge>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <div className="font-medium">Motif de rejet</div>
                  <div className="mt-1">{selectedRequest.rejectionReason}</div>
                </div>
              )}

              <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-3">
                  <BankLogo logoUrl={selectedRequest.logoUrl} bankName={selectedRequest.bankName} size="lg" />
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      Informations bancaires
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedRequest.bankName || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div><span className="text-muted-foreground">Banque</span><div className="font-medium">{selectedRequest.bankName || '-'}</div></div>
                  <div><span className="text-muted-foreground">Email banque</span><div className="font-medium">{selectedRequest.bankEmail || '-'}</div></div>
                  <div><span className="text-muted-foreground">Pays</span><div className="font-medium">{selectedRequest.country || '-'}</div></div>
                  <div><span className="text-muted-foreground">Site web</span><div className="font-medium">{selectedRequest.website || '-'}</div></div>
                  <div><span className="text-muted-foreground">Annee d'etablissement</span><div className="font-medium">{selectedRequest.establishmentYear || '-'}</div></div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Description banque</span><div className="mt-1 rounded-lg bg-muted p-3">{getBankDescription(selectedRequest) || '-'}</div></div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4 text-orange-500" /> Coordonnees
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Contact</span>
                    <div className="font-medium">
                      {selectedRequest.adminContactName || selectedRequest.contactName || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <div className="font-medium">
                      {selectedRequest.adminContactEmail || selectedRequest.contactEmail || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telephone</span>
                    <div className="font-medium">
                      {selectedRequest.adminContactPhone || selectedRequest.contactPhone || '-'}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Globe className="h-4 w-4 text-orange-500" /> Marketplace
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div><span className="text-muted-foreground">Slug</span><div className="font-medium">{selectedRequest.marketplaceSlug || '-'}</div></div>
                  <div><span className="text-muted-foreground">Type</span><div className="font-medium">{requestTypeLabel[selectedRequest.requestType]}</div></div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Description</span><div className="mt-1 rounded-lg bg-muted p-3">{selectedRequest.marketplaceDescription || '-'}</div></div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: selectedRequest.primaryColor }} />
                    <span>{selectedRequest.primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: selectedRequest.secondaryColor }} />
                    <span>{selectedRequest.secondaryColor}</span>
                  </div>
                </div>
              </section>

              {selectedRequest.requestType === 'subscription' ? (
                <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <CreditCard className="h-4 w-4 text-orange-500" /> Détails du renouvellement
                  </h3>
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div><span className="text-muted-foreground">Banque</span><div className="font-medium">{selectedRequest.bankName || '-'}</div></div>
                    <div><span className="text-muted-foreground">Marketplace</span><div className="font-medium">{selectedRequest.marketplaceSlug || '-'}</div></div>
                    <div><span className="text-muted-foreground">Montant</span><div className="font-medium">{formatTnd(selectedRequest.totalMonthlyPrice ?? selectedRequest.totalAmount)}</div></div>
                    <div><span className="text-muted-foreground">Contact</span><div className="font-medium">{selectedRequest.contactName || '-'}</div></div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Description</span><div className="mt-1 rounded-lg bg-muted p-3">{getBankDescription(selectedRequest) || 'Demande de renouvellement envoyée par la banque.'}</div></div>
                  </div>
                </section>
              ) : (
                <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Store className="h-4 w-4 text-orange-500" /> Configuration selectionnee
                  </h3>
                  <div className="space-y-3">
                    {(selectedRequest.selectedStoreDetails || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun detail de configuration disponible.</p>
                    ) : selectedRequest.selectedStoreDetails?.map((store) => (
                      <div key={store.id || store.storeId} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{store.storeName}</div>
                            <p className="text-sm text-muted-foreground">{store.storeDescription || 'Store bancaire'}</p>
                          </div>
                          <Badge variant="secondary">{formatTnd(store.storePrice)}</Badge>
                        </div>
                        <div className="space-y-2">
                          {store.modules.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Aucun module choisi</span>
                          ) : store.modules.map((module) => (
                            <div key={module.id || module.moduleId} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm dark:bg-gray-900">
                              <span className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{module.moduleName}</span>
                              <span className="font-medium">{formatTnd(module.modulePrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Total mensuel</span>
                  <strong className="text-2xl text-orange-600 dark:text-orange-300">{formatTnd(getRequestTotal(selectedRequest))}</strong>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Creee le {formatDate(selectedRequest.createdAt)}</div>
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-border">
                {selectedRequest.requestType !== 'subscription' ? (
                  <Button
                    variant="success"
                    className="flex-1"
                    icon={actionLoadingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    onClick={() => runAction(selectedRequest)}
                    disabled={actionLoadingId === selectedRequest.id}
                  >
                    Approuver
                  </Button>
                ) : null}
                <Button
                  variant="danger"
                  className={selectedRequest.requestType !== 'subscription' ? 'flex-1' : 'w-full'}
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
