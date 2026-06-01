import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { CheckCircle, X, Clock, FileText, Loader2 } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { RequestDto, RequestStatus, RequestType } from '../../types/apiTypes';

const requestTypeLabel: Record<RequestType, string> = {
  join: "Demande d'adhesion",
  store: 'Demande de store',
  module: 'Demande de module',
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

export function Requests() {
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

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

  const groupedRequests = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending'),
    approved: requests.filter((request) => request.status === 'approved'),
    rejected: requests.filter((request) => request.status === 'rejected'),
  }), [requests]);

  const runAction = async (request: RequestDto, action: 'approve' | 'reject') => {
    if (!request.id) return;
    setActionLoadingId(request.id);
    try {
      const response = action === 'approve'
        ? await requestService.approveRequest(request.id)
        : await requestService.rejectRequest(request.id);

      setRequests((prev) => prev.map((item) => item.id === request.id ? response.data : item));
      setSelectedRequest(response.data);
      setIsModalOpen(false);
    } catch (actionError) {
      console.error(`Failed to ${action} request:`, actionError);
      setError("L'action n'a pas pu etre effectuee.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const RequestCard = ({ request }: { request: RequestDto }) => (
    <Card
      hover
      onClick={() => {
        setSelectedRequest(request);
        setIsModalOpen(true);
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <CardTitle>{requestTypeLabel[request.requestType]}</CardTitle>
            </div>
            <CardDescription>{request.bankName || request.description || '-'}</CardDescription>
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
            <span className="text-muted-foreground">Stores:</span>
            <span>{request.storeIds?.length || 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Modules:</span>
            <span>{request.moduleIds?.length || 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Total estime:</span>
            <span>{formatTnd(request.totalAmount)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Date de creation:</span>
            <span>{formatDate(request.createdAt)}</span>
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center text-warning">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{groupedRequests.pending.length}</div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center text-success">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{groupedRequests.approved.length}</div>
                <div className="text-sm text-muted-foreground">Approuvees</div>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center text-destructive">
                <X className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{groupedRequests.rejected.length}</div>
                <div className="text-sm text-muted-foreground">Rejetees</div>
              </div>
            </div>
          </CardHeader>
        </Card>
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
            id: 'all',
            label: 'Toutes',
            content: renderGrid(requests),
          },
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Details de la demande"
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={statusVariant(selectedRequest.status)}>
                  {statusLabel[selectedRequest.status]}
                </Badge>
                {selectedRequest.priority && (
                  <Badge variant="secondary">Priorite: {selectedRequest.priority}</Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Type de demande</div>
                  <div className="font-medium">{requestTypeLabel[selectedRequest.requestType]}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Banque</div>
                  <div className="font-medium">{selectedRequest.bankName || '-'}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Email banque</div>
                    <div className="font-medium">{selectedRequest.bankEmail || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Pays</div>
                    <div className="font-medium">{selectedRequest.country || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Contact</div>
                    <div className="font-medium">{selectedRequest.contactName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Email contact</div>
                    <div className="font-medium">{selectedRequest.contactEmail || '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                  <div className="p-3 bg-muted rounded-lg">{selectedRequest.description || '-'}</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Stores</div>
                    <div className="font-medium">{selectedRequest.storeIds?.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Modules</div>
                    <div className="font-medium">{selectedRequest.moduleIds?.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total</div>
                    <div className="font-medium">{formatTnd(selectedRequest.totalAmount)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Date de creation</div>
                  <div className="font-medium">{formatDate(selectedRequest.createdAt)}</div>
                </div>
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="success"
                  className="flex-1"
                  icon={actionLoadingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  onClick={() => runAction(selectedRequest, 'approve')}
                  disabled={actionLoadingId === selectedRequest.id}
                >
                  Approuver
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  icon={actionLoadingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  onClick={() => runAction(selectedRequest, 'reject')}
                  disabled={actionLoadingId === selectedRequest.id}
                >
                  Rejeter
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
