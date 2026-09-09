import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Store, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StoreBannerManager } from '../../components/bank/StoreBannerManager';
import { KpiCard } from '../../components/ui/KpiCard';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { moduleService } from '../../services/moduleService';
import type { ModuleAssignment } from '../../types/apiTypes';

const getStoreKey = (store: { storeId?: number | null; id: number }) => String(store.storeId ?? store.id);
const getStoreNumericId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;
const isBannerAssignment = (assignment: ModuleAssignment) => {
  const name = `${assignment.module?.name || ''} ${assignment.module?.label || ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return name.includes('banner') || name.includes('banniere');
};

type MarketplaceModuleAssignment = ModuleAssignment & {
  marketplaceAssignmentId: number;
};

export function BankModules() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stores, modulesByStore, marketplace, isLoading, error, refresh } = useBankTenant();
  const [updatingModuleId, setUpdatingModuleId] = useState<number | null>(null);
  const [savingParameterId, setSavingParameterId] = useState<number | null>(null);
  const [parameterDrafts, setParameterDrafts] = useState<Record<number, string>>({});

  const selectedStoreId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('store') || getStoreKey(stores[0] || { id: 0 });
  }, [location.search, stores]);

  const selectedStore = stores.find((store) => getStoreKey(store) === selectedStoreId) || stores[0];
  const selectedStoreNumericId = selectedStore ? getStoreNumericId(selectedStore) : null;
  const isSelectedStoreInactive =
    selectedStore ? selectedStore.enabled === false || selectedStore.visible === false : false;

  const selectedStoreAssignments = useMemo<MarketplaceModuleAssignment[]>(() => {
    if (selectedStoreNumericId == null || !selectedStore) return [];

    const configurationByModuleId = new Map(
      (modulesByStore[selectedStoreNumericId] || []).map((assignment) => [assignment.module?.id, assignment]),
    );

    return (selectedStore.modules || []).map((marketplaceModule, index) => {
      const moduleId = marketplaceModule.moduleId ?? marketplaceModule.id;
      const configuration = configurationByModuleId.get(moduleId);
      const actif = marketplaceModule.enabled !== false && marketplaceModule.visible !== false;

      if (configuration) {
        return {
          ...configuration,
          actif,
          marketplaceAssignmentId: marketplaceModule.id,
        };
      }

      return {
        id: marketplaceModule.id,
        marketplaceAssignmentId: marketplaceModule.id,
        price: typeof marketplaceModule.price === 'number' ? marketplaceModule.price : null,
        module: {
          id: moduleId,
          name: marketplaceModule.name || `Module ${moduleId}`,
          label: marketplaceModule.name || `Module ${moduleId}`,
          description: null,
          icon: null,
          category: marketplaceModule.category || null,
          status: actif ? 'active' : 'inactive',
          price: typeof marketplaceModule.price === 'number' ? marketplaceModule.price : null,
          createdAt: '',
        },
        parameters: [],
        actif,
        ordre: index,
      };
    });
  }, [modulesByStore, selectedStore, selectedStoreNumericId]);

  // Keep inactive assignments visible so that a bank user can enable them again.
  const selectedStoreModules = selectedStoreAssignments;
  const activeSelectedStoreModulesCount = useMemo(
    () => selectedStoreAssignments.filter((assignment) => assignment.actif !== false).length,
    [selectedStoreAssignments],
  );

  const getParameterDraftValue = (parameter: ModuleAssignment['parameters'][number]) => {
    if (parameterDrafts[parameter.id] !== undefined) {
      return parameterDrafts[parameter.id];
    }

    return parameter.value !== undefined && parameter.value !== null ? String(parameter.value) : '';
  };

  const updateParameterDraft = (parameterId: number, value: string) => {
    setParameterDrafts((current) => ({
      ...current,
      [parameterId]: value,
    }));
  };

  const saveParameterValue = async (parameter: ModuleAssignment['parameters'][number]) => {
    if (isSelectedStoreInactive) {
      return;
    }

    setSavingParameterId(parameter.id);
    try {
      const response = await moduleService.updateModuleStoreParameter(parameter.id, {
        name: parameter.name,
        code: parameter.code,
        type: parameter.type,
        required: parameter.required,
        value: getParameterDraftValue(parameter),
      });

      const updatedParameter = response.data.parameters?.find(
        (entry: ModuleAssignment['parameters'][number]) => entry.id === parameter.id,
      );
      if (updatedParameter) {
        setParameterDrafts((current) => ({
          ...current,
          [updatedParameter.id]:
            updatedParameter.value !== undefined && updatedParameter.value !== null
              ? String(updatedParameter.value)
              : '',
        }));
      }

      refresh();
    } catch (updateError) {
      console.error('Failed to update module parameter value:', updateError);
      alert("Impossible de mettre à jour la valeur du parametre.");
    } finally {
      setSavingParameterId(null);
    }
  };

  const visibleStoresCount = useMemo(
    () => stores.filter((store) => store.enabled !== false && store.visible !== false).length,
    [stores],
  );

  const toggleModuleStatus = async (assignment: MarketplaceModuleAssignment, currentEnabled?: boolean | null) => {
    if (assignment.marketplaceAssignmentId == null || assignment.module?.id == null) {
      toast.error("Impossible d'identifier le module ou le store.");
      return;
    }

    const nextEnabled = !(currentEnabled !== false);
    setUpdatingModuleId(assignment.marketplaceAssignmentId);
    try {
      await bankTenantService.updateMarketplaceStoreModuleStatus(assignment.marketplaceAssignmentId, nextEnabled);
      toast.success(
        `${assignment.module.label || assignment.module.name || 'Le module'} a été ${
          nextEnabled ? 'activé' : 'désactivé'
        }.`,
      );
      refresh();
    } catch (updateError) {
      console.error('Failed to update module status:', updateError);
      toast.error("Impossible de mettre à jour le statut du module.");
    } finally {
      setUpdatingModuleId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Modules assignés</h1>
          <p className="text-muted-foreground">
            {marketplace?.bankName ? `Modules de ${marketplace.bankName}` : 'Modules de la marketplace active'}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Stores visibles"
          value={visibleStoresCount}
          icon={<Store className="h-5 w-5" />}
          tone="primary"
          badge={`${visibleStoresCount} stores`}
        />
        <KpiCard
          label="Modules assignés"
          value={activeSelectedStoreModulesCount}
          icon={<Wrench className="h-5 w-5" />}
          tone="success"
          badge={`${selectedStoreModules.length} modules`}
        />
        <KpiCard
          label="Store sélectionné"
          value={selectedStore?.name || '-'}
          icon={<Store className="h-5 w-5" />}
          tone="danger"
          badge={selectedStore ? (selectedStore.enabled === false || selectedStore.visible === false ? 'Inactif' : 'Actif') : 'Aucun'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Sélection du store</CardTitle>
            <CardDescription>Chaque store affiche uniquement ses modules assignés pour cette marketplace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stores.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                Aucun store assigné à cette marketplace.
              </div>
            ) : (
              stores.map((store) => {
                const key = getStoreKey(store);
                const isActive = key === selectedStoreId;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => navigate(`/bank/modules?store=${key}`)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <span className="truncate font-medium">{store.name || `Store ${store.id}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {store.enabled === false || store.visible === false ? 'Inactif' : 'Actif'}
                    </span>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modules du store {selectedStore?.name || selectedStore?.id || '-'}</CardTitle>
              <CardDescription>{activeSelectedStoreModulesCount} module(s) actif(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isSelectedStoreInactive && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="text-sm">
                    Le store sélectionné est inactif. Ses modules sont affichés en lecture seule jusqu’à réactivation.
                  </div>
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Chargement...
                </div>
              ) : selectedStoreModules.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                  Aucun module assigné à ce store.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStoreModules.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isSelectedStoreInactive || assignment.actif === false
                          ? 'border-warning/30 bg-warning/5 opacity-80'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                        <div className="xl:w-40 xl:shrink-0">
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            isSelectedStoreInactive || assignment.actif === false
                              ? 'bg-warning/10 text-warning'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          <Wrench className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {assignment.module.label || assignment.module.name || `Module ${assignment.module.id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignment.module.category || 'Catégorie non précisée'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Badge variant={assignment.actif === false ? 'warning' : 'success'}>
                          {assignment.actif === false ? 'Désactivé' : 'Actif'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {isSelectedStoreInactive ? 'Store inactif' : `Store: ${selectedStore?.name || selectedStore?.id}`}
                        </span>
                      </div>

                        </div>

                      <div className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">Paramètres du module</div>
                            <div className="text-xs text-muted-foreground">
                              Les valeurs ci-dessous peuvent être personnalisées pour la marketplace de cette banque.
                            </div>
                          </div>
                          {assignment.parameters?.length ? (
                            <Badge variant="secondary">{assignment.parameters.length} paramètre(s)</Badge>
                          ) : null}
                        </div>
                        {assignment.parameters?.length ? (
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                            {assignment.parameters.map((parameter) => {
                              const draftValue = getParameterDraftValue(parameter);
                              const inputType =
                                parameter.type === 'number'
                                  ? 'number'
                                  : parameter.type === 'date'
                                    ? 'date'
                                    : 'text';

                              return (
                                <div
                                  key={parameter.id}
                                  className="rounded-lg border border-border bg-card p-2"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-foreground">{parameter.name}</div>
                                      <div className="hidden">
                                        Code: {parameter.code} · Type: {parameter.type}
                                        {parameter.required ? ' · Requis' : ''}
                                      </div>
                                    </div>
                                    <Badge variant="warning">
                                      Obligatoire
                                    </Badge>
                                  </div>

                                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                                    <Input
                                      label="Valeur personnalisée"
                                      type={inputType}
                                      value={draftValue}
                                      onChange={(event) => updateParameterDraft(parameter.id, event.target.value)}
                                      placeholder={
                                        parameter.type === 'number'
                                          ? '0'
                                          : parameter.type === 'date'
                                            ? 'AAAA-MM-JJ'
                                            : 'Saisir la valeur'
                                      }
                                      disabled={isSelectedStoreInactive}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      loading={savingParameterId === parameter.id}
                                      disabled={isSelectedStoreInactive}
                                      onClick={() => saveParameterValue(parameter)}
                                    >
                                      Enregistrer
                                    </Button>
                                  </div>

                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {draftValue ? `Valeur actuelle : ${draftValue}` : 'Aucune valeur personnalisée'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Aucun paramètre configuré pour ce module.
                          </div>
                        )}
                      </div>

                      {isBannerAssignment(assignment) && selectedStore && assignment.actif !== false && (
                        <StoreBannerManager
                          marketplaceStoreId={selectedStore.id}
                          storeName={selectedStore.name}
                          disabled={isSelectedStoreInactive}
                          onSaved={refresh}
                        />
                      )}

                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant={assignment.actif === false ? 'success' : 'danger'}
                          loading={updatingModuleId === assignment.marketplaceAssignmentId}
                          disabled={isSelectedStoreInactive}
                          onClick={() => toggleModuleStatus(assignment, assignment.actif)}
                        >
                          {isSelectedStoreInactive
                            ? 'Store inactif'
                            : assignment.actif === false
                              ? 'Activer'
                              : 'Désactiver'}
                        </Button>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
