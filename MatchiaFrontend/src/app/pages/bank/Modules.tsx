import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Plus } from 'lucide-react';

export function BankModules() {
  const [selectedStore, setSelectedStore] = useState('vehicle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestStore, setRequestStore] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const storeModules = {
    vehicle: [
      { id: '1', name: 'Simulator', description: 'Interactive loan calculator for monthly payments' },
      { id: '2', name: 'Comparator', description: 'Side-by-side product comparison tool' },
      { id: '3', name: 'Blog', description: 'Educational articles and financing guides' },
      { id: '5', name: 'Matchia Bot', description: '24/7 AI-powered customer support assistant' },
    ],
    mobile: [
      { id: '1', name: 'Simulator', description: 'Interactive loan calculator for monthly payments' },
      { id: '2', name: 'Comparator', description: 'Side-by-side product comparison tool' },
      { id: '5', name: 'Matchia Bot', description: '24/7 AI-powered customer support assistant' },
    ],
    medical: [
      { id: '1', name: 'Simulator', description: 'Interactive loan calculator for monthly payments' },
      { id: '3', name: 'Blog', description: 'Educational articles and financing guides' },
      { id: '5', name: 'Matchia Bot', description: '24/7 AI-powered customer support assistant' },
    ],
  };

  const currentModules = storeModules[selectedStore as keyof typeof storeModules] || [];

  const availableModules = [
    { value: 'ads', label: 'Promotional Ads' },
    { value: 'analytics', label: 'Analytics Dashboard' },
    { value: 'chat', label: 'Live Chat' },
  ];

  const toggleModule = (moduleValue: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleValue)
        ? prev.filter(m => m !== moduleValue)
        : [...prev, moduleValue]
    );
  };

  const handleRequestModule = () => {
    // Handle request submission
    setIsModalOpen(false);
    setRequestStore('');
    setSelectedModules([]);
    setDescription('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assigned Modules</h1>
          <p className="text-muted-foreground">Manage modules for your stores</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
          Request New Module
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select a Store</CardTitle>
          <CardDescription>Choose a store to view its assigned modules</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            options={[
              { value: 'vehicle', label: 'Vehicle Store' },
              { value: 'mobile', label: 'Mobile Store' },
              { value: 'medical', label: 'Medical Store' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
        <p className="text-sm">
          <strong>Note:</strong> Only modules assigned by the SaaS administrator for this store appear here.
          You can request additional modules using the "Request New Module" button.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentModules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                <span className="text-2xl">🔧</span>
              </div>
              <CardTitle>{module.name}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request New Module"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Select a store and the modules you want to request. Your request will be reviewed by the SaaS administrator.
          </p>
          <Select
            label="Select Store"
            value={requestStore}
            onChange={(e) => setRequestStore(e.target.value)}
            options={[
              { value: '', label: 'Choose a store...' },
              { value: 'vehicle', label: 'Vehicle Store' },
              { value: 'mobile', label: 'Mobile Store' },
              { value: 'medical', label: 'Medical Store' },
            ]}
          />

          {requestStore && (
            <div>
              <label className="block mb-2 text-sm font-medium">Select Modules (Multiple)</label>
              <div className="space-y-2">
                {availableModules.map((module) => (
                  <label key={module.value} className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.value)}
                      onChange={() => toggleModule(module.value)}
                      className="w-4 h-4"
                    />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block mb-2 text-sm font-medium">Description / Justification</label>
            <textarea
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              placeholder="Explain why you need these modules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleRequestModule} disabled={!requestStore || selectedModules.length === 0}>
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
