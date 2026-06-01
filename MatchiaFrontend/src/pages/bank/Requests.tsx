import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus, FileText } from 'lucide-react';

export function BankRequests() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'store' | 'module'>('store');

  const requests = [
    { id: '1', type: 'store', item: 'Immobilier', status: 'pending', date: '2026-04-15' },
    { id: '2', type: 'module', item: 'Publicités', status: 'approved', date: '2026-04-10' },
    { id: '3', type: 'module', item: 'Analytics', status: 'pending', date: '2026-04-18' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mes demandes</h1>
          <p className="text-muted-foreground">Demandez de nouveaux stores ou modules</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
          Nouvelle demande
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardDescription>Total demandes</CardDescription>
            <div className="text-3xl font-bold mt-2">{requests.length}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>En attente</CardDescription>
            <div className="text-3xl font-bold mt-2 text-warning">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approuvées</CardDescription>
            <div className="text-3xl font-bold mt-2 text-success">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>Toutes vos demandes auprès du SaaS Admin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="p-4 border border-border rounded-lg hover:border-primary transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium mb-1">
                        Demande de {request.type === 'store' ? 'store' : 'module'}: {request.item}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Créée le {new Date(request.date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'danger'}>
                    {request.status === 'pending' ? 'En attente' : request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle demande"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm">Type de demande</label>
            <select
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as 'store' | 'module')}
            >
              <option value="store">Store</option>
              <option value="module">Module</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm">
              {requestType === 'store' ? 'Quel store souhaitez-vous ?' : 'Quel module souhaitez-vous ?'}
            </label>
            <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              {requestType === 'store' ? (
                <>
                  <option>Immobilier</option>
                  <option>Assurance</option>
                  <option>Éducation</option>
                </>
              ) : (
                <>
                  <option>Publicités</option>
                  <option>Analytics</option>
                  <option>Chat en direct</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm">Justification</label>
            <textarea
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              placeholder="Expliquez pourquoi vous avez besoin de cet élément..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="flex-1">Envoyer la demande</Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
