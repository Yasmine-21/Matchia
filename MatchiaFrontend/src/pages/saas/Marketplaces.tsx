import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ChevronDown, Plus } from 'lucide-react';
import { SaaSMatrix } from './Matrix';

const marketplaceBanks = [
  {
    id: '1',
    name: 'Banque Centrale',
    status: 'Actif',
    stores: [
      { id: '1', name: 'Store Financement', status: 'Actif', modules: 8 },
      { id: '2', name: 'Store Epargne', status: 'Inactif', modules: 4 },
    ],
  },
  {
    id: '2',
    name: 'Crédit Plus',
    status: 'Actif',
    stores: [
      { id: '3', name: 'Store PME', status: 'Actif', modules: 5 },
      { id: '4', name: 'Store Projets', status: 'Actif', modules: 7 },
    ],
  },
  {
    id: '3',
    name: 'Finance Express',
    status: 'Inactif',
    stores: [
      { id: '5', name: 'Store Cartes', status: 'Actif', modules: 3 },
      { id: '6', name: 'Store Assurance', status: 'Inactif', modules: 2 },
    ],
  },
];

export function Marketplaces() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplaces</h1>
          <p className="text-gray-600 mt-2">Surveillez les banques et leurs stores actifs dans votre plateforme.</p>
        </div>
        <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4" /> Créer Marketplace
        </Button>
      </div>

      <div className="space-y-6">
        {marketplaceBanks.map((bank) => (
          <Card key={bank.id} className="bg-card border border-border shadow-sm rounded-xl">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-lg">{bank.name}</CardTitle>
                <Badge variant={bank.status === 'Actif' ? 'primary' : 'secondary'} className="bg-orange-100 text-orange-600">
                  {bank.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">{bank.stores.length} stores</div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {bank.stores.map((store) => (
                <div key={store.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{store.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{store.modules} modules</div>
                    </div>
                    <Badge className={store.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                      {store.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-orange-600 font-medium cursor-pointer">
                    <span className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4" />
                      {store.modules} modules
                    </span>
                    <span className="text-xs uppercase tracking-wider">Détails</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-8">
        <SaaSMatrix />
      </div>
    </div>
  );
}