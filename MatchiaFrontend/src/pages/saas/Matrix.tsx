import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Badge } from '../../components/ui/Badge';
import { Building2, CheckCircle, Loader2, Package, Save, Wrench } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { bankService } from '../../services/bankService';
import { storeService } from '../../services/storeService';
import { moduleService } from '../../services/moduleService';
import { Bank } from '../../types';
import { ModuleDto, StoreDto } from '../../types/apiTypes';

interface MarketplaceStoreAssignment {
  id: number;
  bankId: number;
  marketplaceId: number;
  storeId: number;
  enabled: boolean;
  visible: boolean;
}

const getLogoUrl = (logoUrl?: string | null) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `http://localhost:8081${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
};

const getStoreLabel = (store: StoreDto) => store.name || `Store ${store.id}`;

const getModuleLabel = (module: ModuleDto) => module.label || module.name || `Module ${module.id}`;

function BankLogo({ bank }: { bank: Bank }) {
  const [hasError, setHasError] = useState(false);
  const src = !hasError ? getLogoUrl(bank.logoUrl || bank.logo_url) : null;

  useEffect(() => {
    setHasError(false);
  }, [bank.logoUrl, bank.logo_url]);

  if (!src) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-orange-50 text-orange-500">
        <Building2 className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={bank.name}
      className="h-8 w-8 shrink-0 rounded-lg border border-gray-200 bg-white object-contain p-1"
      onError={() => setHasError(true)}
    />
  );
}

export function SaaSMatrix() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [bankStores, setBankStores] = useState<Record<string, Record<string, boolean>>>({});
  const [storeModules, setStoreModules] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMatrixData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [banksData, storesResponse] = await Promise.all([
          bankService.getAllBanks(),
          storeService.getAllStores(),
        ]);

        const storesData = storesResponse.data;
        const modulesData = await moduleService.getAllModules()
          .then((response) => response.data)
          .catch((modulesError) => {
            console.warn('Failed to load modules for matrix:', modulesError);
            return [];
          });
        const assignments = await apiClient.get<MarketplaceStoreAssignment[]>('/api/v1/marketplace-stores')
          .then((response) => response.data || [])
          .catch((assignmentsError) => {
            console.warn('Failed to load bank-store assignments:', assignmentsError);
            return [];
          });
        const nextBankStores: Record<string, Record<string, boolean>> = {};

        assignments.forEach((assignment) => {
          if (!assignment.bankId || !assignment.storeId) return;
          const bankId = String(assignment.bankId);
          const storeId = String(assignment.storeId);
          nextBankStores[bankId] = {
            ...(nextBankStores[bankId] || {}),
            [storeId]: assignment.enabled !== false && assignment.visible !== false,
          };
        });

        setBanks(banksData);
        setStores(storesData);
        setModules(modulesData);
        setBankStores(nextBankStores);
        setSelectedBank(banksData[0]?.id ? String(banksData[0].id) : '');
        setSelectedStore(storesData[0]?.id ? String(storesData[0].id) : '');
      } catch (loadError) {
        console.error('Failed to load assignment matrix:', loadError);
        setError("Impossible de charger la matrice d'attribution.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMatrixData();
  }, []);

  const toggleBankStore = (bankId: string, storeId: string) => {
    setBankStores((prev) => ({
      ...prev,
      [bankId]: {
        ...(prev[bankId] || {}),
        [storeId]: !prev[bankId]?.[storeId],
      },
    }));
  };

  const toggleStoreModule = (storeId: string, moduleId: string) => {
    setStoreModules((prev) => ({
      ...prev,
      [storeId]: {
        ...(prev[storeId] || {}),
        [moduleId]: !prev[storeId]?.[moduleId],
      },
    }));
  };

  const selectedBankData = banks.find((bank) => String(bank.id) === selectedBank);
  const selectedStoreData = stores.find((store) => String(store.id) === selectedStore);

  const assignedStores = useMemo(
    () => stores.filter((store) => bankStores[selectedBank]?.[String(store.id)]),
    [bankStores, selectedBank, stores]
  );

  const assignedModules = useMemo(
    () => modules.filter((module) => storeModules[selectedStore]?.[String(module.id)]),
    [modules, selectedStore, storeModules]
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement de la matrice...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Matrice d'attribution</h1>
        <p className="text-muted-foreground">
          Gerez l'attribution des stores aux banques et des modules aux stores
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attribution Store vers Banque</CardTitle>
            <CardDescription>
              Selectionnez les stores disponibles pour chaque banque
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              label="Selectionner une banque"
              value={selectedBank}
              onChange={(event) => setSelectedBank(event.target.value)}
              options={banks.map((bank) => ({ value: String(bank.id), label: bank.name }))}
            />

            {selectedBankData && (
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <BankLogo bank={selectedBankData} />
                  <div>
                    <div className="font-semibold">{selectedBankData.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedBankData.country || '-'}</div>
                  </div>
                </div>
                <div className="mb-3 text-sm font-medium">
                  Stores assignes: {assignedStores.length} / {stores.length}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Stores disponibles</h4>
              {stores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun store disponible.</p>
              ) : stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{getStoreLabel(store)}</div>
                      <div className="text-xs text-muted-foreground">
                        {store.modulesCount ?? 0} modules
                      </div>
                    </div>
                  </div>
                  <Toggle
                    enabled={bankStores[selectedBank]?.[String(store.id)] || false}
                    onChange={() => toggleBankStore(selectedBank, String(store.id))}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" icon={<Save className="h-4 w-4" />}>
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribution Module vers Store</CardTitle>
            <CardDescription>
              Selectionnez les modules disponibles pour chaque store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              label="Selectionner un store"
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
              options={stores.map((store) => ({ value: String(store.id), label: getStoreLabel(store) }))}
            />

            {selectedStoreData && (
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">{getStoreLabel(selectedStoreData)}</div>
                    <div className="text-sm text-muted-foreground">Store de financement</div>
                  </div>
                </div>
                <div className="mb-3 text-sm font-medium">
                  Modules assignes: {assignedModules.length} / {modules.length}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Modules disponibles</h4>
              {modules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun module disponible.</p>
              ) : modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{getModuleLabel(module)}</div>
                      <div className="text-xs text-muted-foreground">{module.status}</div>
                    </div>
                  </div>
                  <Toggle
                    enabled={storeModules[selectedStore]?.[String(module.id)] || false}
                    onChange={() => toggleStoreModule(selectedStore, String(module.id))}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" icon={<Save className="h-4 w-4" />}>
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vue d'ensemble de l'attribution</CardTitle>
          <CardDescription>Matrice complete des attributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">Banque</th>
                  {stores.map((store) => (
                    <th key={store.id} className="px-4 py-3 text-center">{getStoreLabel(store)}</th>
                  ))}
                  <th className="px-4 py-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {banks.length === 0 ? (
                  <tr>
                    <td colSpan={stores.length + 2} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune banque disponible.
                    </td>
                  </tr>
                ) : banks.map((bank) => {
                  const assignedCount = stores.filter((store) => bankStores[String(bank.id)]?.[String(store.id)]).length;

                  return (
                    <tr key={bank.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex min-w-[180px] items-center gap-2">
                          <BankLogo bank={bank} />
                          <div className="min-w-0">
                            <span className="block truncate font-medium">{bank.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{bank.slug}</span>
                          </div>
                        </div>
                      </td>
                      {stores.map((store) => (
                        <td key={store.id} className="px-4 py-3 text-center">
                          {bankStores[String(bank.id)]?.[String(store.id)] ? (
                            <CheckCircle className="mx-auto h-5 w-5 text-success" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
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
