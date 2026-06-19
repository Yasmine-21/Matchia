import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Building2, Clock, CreditCard, Eye, FileText, Loader2, X, CheckCircle } from 'lucide-react';
import { useBankTenant } from '../../hooks/useBankTenant';
import { requestService } from '../../services/requestService';
import { useApp } from '../../context/AppContext';
import { RequestDto, RequestStatus, RequestType } from '../../types/apiTypes';
import { KpiCard } from '../../components/ui/KpiCard';

const statusLabel: Record<RequestStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvee',
  rejected: 'Rejetee',
};

const requestTypeLabel: Record<RequestType, string> = {
  join: "Demande d'inscription",
  store: 'Demande de store',
  module: 'Demande de module',
  subscription: "Renouvellement d'abonnement",
};

const isSubscriptionRequest = (request?: RequestDto | null) => request?.requestType === 'subscription';

const statusVariant = (status: RequestStatus) => (
  status === 'pending' ? 'warning' : status === 'approved' ? 'success' : 'danger'
);

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-');

const formatTnd = (amount?: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const getBankDescription = (request: RequestDto) => request.bankDescription || request.description || null;

export function BankRequests() {
  const { currentBank, currentUser } = useApp();
  const { marketplace, isLoading: isTenantLoading, error: tenantError } = useBankTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const openedRequestFromQueryRef = useRef<number | null>(null);
  const tenantBankId = useMemo(() => {
    if (currentBank?.id) {
      return currentBank.id;
    }
    if (marketplace?.bankId) {
      return marketplace.bankId;
    }
    if (currentUser?.bank_id) {
      const parsedBankId = Number(currentUser.bank_id);
      return Number.isFinite(parsedBankId) ? parsedBankId : null;
    }
    return null;
  }, [currentBank?.id, currentUser?.bank_id, marketplace?.bankId]);

  const loadRequests = async () => {
    if (!tenantBankId) {
      setRequests([]);
      setIsLoading(false);
      setError(tenantError || "Impossible d'identifier la banque courante.");
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await requestService.getBankRequests(tenantBankId);
      setRequests(
        response.data.filter((request) =>
          request.requestType === 'store' || request.requestType === 'module'
          || request.requestType === 'subscription'
        ),
      );
    } catch (loadError) {
      console.error('Failed to load bank requests:', loadError);
      setError('Impossible de charger les demandes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [tenantBankId, tenantError]);

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
      setSelectedRequest(matchingRequest);
      setIsModalOpen(true);
      return;
    }

    requestService.getBankRequestById(requestId)
      .then((response) => {
        setSelectedRequest(response.data);
        setIsModalOpen(true);
      })
      .catch((detailError) => {
        console.error('Failed to load request from notification:', detailError);
      });
  }, [requests, searchParams]);

  const closeDetails = () => {
    setIsModalOpen(false);

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

  const RequestCard = ({ request }: { request: RequestDto }) => (
    <Card hover className="border-border/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{request.bankName || '-'}</CardTitle>
            <CardDescription className="break-all text-sm">
              {requestTypeLabel[request.requestType]}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(request.status)}>{statusLabel[request.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Type</div>
            <div className="mt-1 font-medium">{requestTypeLabel[request.requestType]}</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total mensuel</div>
            <div className="mt-1 font-semibold">{formatTnd(request.totalMonthlyPrice ?? request.totalAmount)}</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Date</div>
            <div className="mt-1 font-medium">{formatDate(request.createdAt)}</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => {
              setSelectedRequest(request);
              setIsModalOpen(true);
            }}
            type="button"
          >
            Voir details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mes demandes</h1>
          <p className="text-muted-foreground">
            {marketplace?.bankName
              ? `Consultez les demandes de ${marketplace.bankName}.`
              : 'Consultez vos demandes de store et de module.'}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isTenantLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement du tenant...
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="En attente"
          value={groupedRequests.pending.length}
          icon={<Clock className="h-5 w-5" />}
          tone="warning"
          badge={`${groupedRequests.pending.length} demandes`}
        />
        <KpiCard
          label="Approuvées"
          value={groupedRequests.approved.length}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="success"
          badge={`${groupedRequests.approved.length} demandes`}
        />
        <KpiCard
          label="Rejetées"
          value={groupedRequests.rejected.length}
          icon={<X className="h-5 w-5" />}
          tone="danger"
          badge={`${groupedRequests.rejected.length} demandes`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>Toutes les demandes de votre banque</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des demandes...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aucune demande disponible pour cette banque.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeDetails}
        title="Details de la demande"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={statusVariant(selectedRequest.status)}>{statusLabel[selectedRequest.status]}</Badge>
              <div className="text-sm text-muted-foreground">{requestTypeLabel[selectedRequest.requestType]}</div>
            </div>

            <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-orange-500" /> Demande
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Créée le</span>
                  <div className="font-medium">{formatDate(selectedRequest.createdAt)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <div className="font-medium">{formatTnd(selectedRequest.totalMonthlyPrice ?? selectedRequest.totalAmount)}</div>
                </div>
              </div>
            </section>

            {selectedRequest.rejectionReason && (
              <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <h3 className="mb-2 font-semibold">Motif de rejet</h3>
                <p className="text-sm">{selectedRequest.rejectionReason}</p>
              </section>
            )}

            {isSubscriptionRequest(selectedRequest) ? (
              <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <CreditCard className="h-4 w-4 text-orange-500" /> Détails du renouvellement
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Abonnement</span>
                    <div className="font-medium">{getBankDescription(selectedRequest) || 'Renouvellement marketplace'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marketplace</span>
                    <div className="font-medium">{selectedRequest.marketplaceSlug || '-'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Montant</span>
                    <div className="font-medium">{formatTnd(selectedRequest.totalMonthlyPrice ?? selectedRequest.totalAmount)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact</span>
                    <div className="font-medium">{selectedRequest.contactName || '-'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Description</span>
                    <div className="mt-1 rounded-lg bg-muted p-3">
                      {getBankDescription(selectedRequest) || 'Demande de renouvellement envoyée par la banque.'}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-white p-4 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-orange-500" /> Stores et modules demandés
                </h3>
                <div className="space-y-3">
                  {(selectedRequest.selectedStoreDetails || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun détail de store demandé n'est disponible.</p>
                  ) : (
                    selectedRequest.selectedStoreDetails?.map((store) => (
                      <div key={store.id || store.storeId} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{store.storeName}</div>
                            <p className="text-sm text-muted-foreground">{store.storeDescription || 'Store demandé'}</p>
                          </div>
                          <Badge variant="secondary">{formatTnd(store.storePrice)}</Badge>
                        </div>
                        <div className="space-y-2">
                          {(store.modules || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">Aucun module demandé pour ce store.</div>
                          ) : (
                            store.modules.map((module) => (
                              <div key={module.id || module.moduleId} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm dark:bg-gray-900">
                                <span className="font-medium">{module.moduleName}</span>
                                <span className="font-semibold">{formatTnd(module.modulePrice)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
