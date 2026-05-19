import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { CheckCircle, X, Clock, FileText } from 'lucide-react';
import { requests } from '../../data/mockData';

export function SaaSRequests() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const handleApprove = (requestId: string) => {
    setIsModalOpen(false);
  };

  const handleReject = (requestId: string) => {
    setIsModalOpen(false);
  };

  const RequestCard = ({ request }: { request: any }) => (
    <Card
      hover
      onClick={() => {
        setSelectedRequest(request);
        setIsModalOpen(true);
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <CardTitle>
                {request.request_type === 'join' ? 'Demande d\'adhésion' :
                  request.request_type === 'store' ? 'Demande de store' :
                    'Demande de module'}
              </CardTitle>
            </div>
            <CardDescription>{request.notes}</CardDescription>
          </div>
          <Badge variant={
            request.status === 'pending' ? 'warning' :
              request.status === 'approved' ? 'success' :
                'danger'
          }>
            {request.status === 'pending' ? 'En attente' :
              request.status === 'approved' ? 'Approuvée' :
                'Rejetée'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Priorité:</span>
            <Badge variant={
              request.priority === 'high' ? 'danger' :
                request.priority === 'medium' ? 'warning' :
                  'default'
            }>
              {request.priority === 'high' ? 'Haute' :
                request.priority === 'medium' ? 'Moyenne' :
                  'Basse'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date de création:</span>
            <span>{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des demandes</h1>
        <p className="text-muted-foreground">Examinez et gérez toutes les demandes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center text-warning">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingRequests.length}</div>
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
                <div className="text-2xl font-bold">{approvedRequests.length}</div>
                <div className="text-sm text-muted-foreground">Approuvées</div>
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
                <div className="text-2xl font-bold">{rejectedRequests.length}</div>
                <div className="text-sm text-muted-foreground">Rejetées</div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs
        tabs={[
          {
            id: 'pending',
            label: `En attente (${pendingRequests.length})`,
            content: (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )
          },
          {
            id: 'approved',
            label: `Approuvées (${approvedRequests.length})`,
            content: (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )
          },
          {
            id: 'all',
            label: 'Toutes',
            content: (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )
          }
        ]}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Détails de la demande"
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={
                  selectedRequest.status === 'pending' ? 'warning' :
                    selectedRequest.status === 'approved' ? 'success' :
                      'danger'
                }>
                  {selectedRequest.status === 'pending' ? 'En attente' :
                    selectedRequest.status === 'approved' ? 'Approuvée' :
                      'Rejetée'}
                </Badge>
                <Badge variant={
                  selectedRequest.priority === 'high' ? 'danger' :
                    selectedRequest.priority === 'medium' ? 'warning' :
                      'default'
                }>
                  Priorité: {selectedRequest.priority === 'high' ? 'Haute' :
                    selectedRequest.priority === 'medium' ? 'Moyenne' :
                      'Basse'}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Type de demande</div>
                  <div className="font-medium">
                    {selectedRequest.request_type === 'join' ? 'Demande d\'adhésion' :
                      selectedRequest.request_type === 'store' ? 'Demande de store' :
                        'Demande de module'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Notes</div>
                  <div className="p-3 bg-muted rounded-lg">{selectedRequest.notes}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Date de création</div>
                  <div className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="success"
                  className="flex-1"
                  icon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => handleApprove(selectedRequest.id)}
                >
                  Approuver
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  icon={<X className="w-4 h-4" />}
                  onClick={() => handleReject(selectedRequest.id)}
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
