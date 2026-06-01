import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, Save } from 'lucide-react';
import { banks, stores, modules } from '../../data/mockData';

export function SaaSMatrix() {
  const [selectedBank, setSelectedBank] = useState(banks[0].id);
  const [selectedStore, setSelectedStore] = useState(stores[0].id);

  const [bankStores, setBankStores] = useState<Record<string, Record<string, boolean>>>({
    '1': { '1': true, '2': true, '3': true },
    '2': { '1': true, '4': true },
  });

  const [storeModules, setStoreModules] = useState<Record<string, Record<string, boolean>>>({
    '1': { '1': true, '2': true, '3': true, '5': true },
    '2': { '1': true, '2': true, '5': true },
    '3': { '1': true, '3': true, '5': true },
    '4': { '1': true, '2': true, '3': true, '5': true },
  });

  const toggleBankStore = (bankId: string, storeId: string) => {
    setBankStores(prev => ({
      ...prev,
      [bankId]: {
        ...(prev[bankId] || {}),
        [storeId]: !prev[bankId]?.[storeId]
      }
    }));
  };

  const toggleStoreModule = (storeId: string, moduleId: string) => {
    setStoreModules(prev => ({
      ...prev,
      [storeId]: {
        ...(prev[storeId] || {}),
        [moduleId]: !prev[storeId]?.[moduleId]
      }
    }));
  };

  const selectedBankData = banks.find(b => b.id === selectedBank);
  const assignedStores = stores.filter(s => bankStores[selectedBank]?.[s.id]);
  const selectedStoreData = stores.find(s => s.id === selectedStore);
  const assignedModules = modules.filter(m => storeModules[selectedStore]?.[m.id]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Matrice d'attribution</h1>
        <p className="text-muted-foreground">
          Gérez l'attribution des stores aux banques et des modules aux stores
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attribution Store → Banque</CardTitle>
            <CardDescription>
              Sélectionnez les stores disponibles pour chaque banque
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              label="Sélectionner une banque"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              options={banks.map(b => ({ value: b.id, label: b.name }))}
            />

            {selectedBankData && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <img src={selectedBankData.logo_url} alt={selectedBankData.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div>
                    <div className="font-semibold">{selectedBankData.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedBankData.country}</div>
                  </div>
                </div>
                <div className="text-sm mb-3 font-medium">
                  Stores assignés: {assignedStores.length} / {stores.length}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Stores disponibles</h4>
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <span className="text-xl">📦</span>
                    </div>
                    <div>
                      <div className="font-medium">{store.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {store.usage_count} utilisations
                      </div>
                    </div>
                  </div>
                  <Toggle
                    enabled={bankStores[selectedBank]?.[store.id] || false}
                    onChange={() => toggleBankStore(selectedBank, store.id)}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" icon={<Save className="w-4 h-4" />}>
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribution Module → Store</CardTitle>
            <CardDescription>
              Sélectionnez les modules disponibles pour chaque store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              label="Sélectionner un store"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              options={stores.map(s => ({ value: s.id, label: s.label }))}
            />

            {selectedStoreData && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div>
                    <div className="font-semibold">{selectedStoreData.label}</div>
                    <div className="text-sm text-muted-foreground">Store de financement</div>
                  </div>
                </div>
                <div className="text-sm mb-3 font-medium">
                  Modules assignés: {assignedModules.length} / {modules.length}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Modules disponibles</h4>
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                      <span className="text-xl">🔧</span>
                    </div>
                    <div>
                      <div className="font-medium">{module.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {module.usage_count} utilisations
                      </div>
                    </div>
                  </div>
                  <Toggle
                    enabled={storeModules[selectedStore]?.[module.id] || false}
                    onChange={() => toggleStoreModule(selectedStore, module.id)}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" icon={<Save className="w-4 h-4" />}>
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vue d'ensemble de l'attribution</CardTitle>
          <CardDescription>Matrice complète des attributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Banque</th>
                  {stores.map(store => (
                    <th key={store.id} className="text-center py-3 px-4">{store.label}</th>
                  ))}
                  <th className="text-center py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {banks.map(bank => {
                  const assignedCount = stores.filter(s => bankStores[bank.id]?.[s.id]).length;
                  return (
                    <tr key={bank.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img src={bank.logo_url} alt={bank.name} className="w-8 h-8 rounded object-cover" />
                          <span className="font-medium">{bank.name}</span>
                        </div>
                      </td>
                      {stores.map(store => (
                        <td key={store.id} className="text-center py-3 px-4">
                          {bankStores[bank.id]?.[store.id] ? (
                            <CheckCircle className="w-5 h-5 text-success mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center py-3 px-4">
                        <Badge variant="primary">{assignedCount}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
