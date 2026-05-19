import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Plus } from 'lucide-react';
import { Select } from '../../components/ui/Select';

export function BankStores() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [description, setDescription] = useState('');

  const assignedStores = [
    { id: '1', name: 'vehicle', label: 'Vehicle Store', description: 'Auto loans, leasing options, and vehicle financing solutions' },
    { id: '2', name: 'mobile', label: 'Mobile Store', description: 'Phone financing plans and mobile device payment options' },
    { id: '3', name: 'medical', label: 'Medical Store', description: 'Healthcare financing and medical equipment loans' },
  ];

  const availableStores = [
    { value: 'real-estate', label: 'Real Estate Store' },
    { value: 'education', label: 'Education Store' },
    { value: 'insurance', label: 'Insurance Store' },
  ];

  const handleRequestStore = () => {
    // Handle request submission
    setIsModalOpen(false);
    setSelectedStore('');
    setDescription('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assigned Stores</h1>
          <p className="text-muted-foreground">Manage stores assigned by the SaaS Admin</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
          Request New Store
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
        <p className="text-sm">
          <strong>Note:</strong> Only stores assigned by the SaaS administrator appear here.
          You can request additional stores using the "Request New Store" button.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedStores.map((store) => (
          <Card key={store.id}>
            <CardHeader>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <CardTitle>{store.label}</CardTitle>
              <CardDescription>{store.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request New Store"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Select a store to request from the available catalog. Your request will be reviewed by the SaaS administrator.
          </p>
          <Select
            label="Select Store"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            options={[
              { value: '', label: 'Choose a store...' },
              ...availableStores
            ]}
          />
          <div>
            <label className="block mb-2 text-sm font-medium">Description / Justification</label>
            <textarea
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              placeholder="Explain why you need this store..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleRequestStore} disabled={!selectedStore}>
              Submit Request
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
