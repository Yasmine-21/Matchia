import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Store, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KpiCard } from '../../components/ui/KpiCard';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { moduleService } from '../../services/moduleService';
import type { MarketplacePublicDto, ModuleAssignment } from '../../types/apiTypes';

const getStoreKey = (store: { storeId?: number | null; id: number }) => String(store.storeId ?? store.id);
const getStoreNumericId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;

export function BankModules() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stores, modulesByStore, marketplace, isLoading, error, refresh } = useBankTenant();
  const [updatingModuleId, setUpdatingModuleId] = useState<number | null>(null);
  const [savingParameterId, setSavingParameterId] = useState<number | null>(null);
  const [parameterDrafts, setParameterDrafts] = useState<Record<number, string>>({});
  const [publicMarketplace, setPublicMarketplace] = useState<MarketplacePublicDto | null>(null);

  const selectedStoreId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('store') || getStoreKey(stores[0] || { id: 0 });
  }, [location.search, stores]);

  const selectedStore = stores.find((store) => getStoreKey(store) === selectedStoreId) || stores[0];
  const selectedStoreNumericId = selectedStore ? getStoreNumericId(selectedStore) : null;
  const isSelectedStoreInactive =
    selectedStore ? selectedStore.enabled === false || selectedStore.visible === false : false;

  const selectedStoreAssignments = useMemo(() => {
    if (selectedStoreNumericId == null) return [];

    const assignments = modulesByStore[selectedStoreNumericId] || [];
    const publicStore = (publicMarketplace?.stores || []).find(
      (store) => (store.storeId ?? store.id) === selectedStoreNumericId,
    );

    if (!publicStore) {
      return assignments;
    }

    const publicModuleIds = new Set(
      (publicStore.modules || [])
        .map((module) => module.moduleId ?? module.id)
        .filter((moduleId): moduleId is number => typeof moduleId === 'number'),
    );

    return assignments.filter((assignment) => {
      const moduleId = assignment.module?.id;
      return moduleId != null && publicModuleIds.has(moduleId);
    });
  }, [modulesByStore, publicMarketplace, selectedStoreNumericId]);

  const selectedStoreModules = useMemo(() => {
    if (isSelectedStoreInactive) {
      return selectedStoreAssignments;
    }

    return selectedStoreAssignments.filter((assignment) => assignment.actif !== false);
  }, [isSelectedStoreInactive, selectedStoreAssignments]);

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

  useEffect(() => {
    const slug = marketplace?.bankSlug;
    if (!slug) {
      setPublicMarketplace(null);
      return;
    }

    let mounted = true;

    const loadPublicMarketplace = async () => {
      try {
        const response = await bankTenantService.getPublicMarketplaceBySlug(slug);
        if (mounted) {
          setPublicMarketplace(response);
        }
      } catch (loadError) {
        console.error('Failed to load public marketplace for modules page:', loadError);
        if (mounted) {
          setPublicMarketplace(null);
        }
      }
    };

    void loadPublicMarketplace();

    return () => {
      mounted = false;
    };
  }, [marketplace?.bankSlug]);

  const toggleModuleStatus = async (assignment: ModuleAssignment, currentEnabled?: boolean | null) => {
    const nextEnabled = !(currentEnabled !== false);
    setUpdatingModuleId(assignment.id);
    try {
      await bankTenantService.updateMarketplaceStoreModuleStatus(assignment.id, nextEnabled);
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
          value={selectedStoreModules.length}
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

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modules du store {selectedStore?.name || selectedStore?.id || '-'}</CardTitle>
              <CardDescription>{selectedStoreModules.length} module(s) actif(s)</CardDescription>
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {selectedStoreModules.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isSelectedStoreInactive || assignment.actif === false
                          ? 'border-warning/30 bg-warning/5 opacity-80'
                          : 'border-border'
                      }`}
                    >
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

                      <div className="mt-4 rounded-xl border border-border bg-background p-4">
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
                          <div className="space-y-3">
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
                                  className="rounded-xl border border-border bg-card p-3 shadow-sm"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-foreground">{parameter.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Code: {parameter.code} · Type: {parameter.type}
                                        {parameter.required ? ' · Requis' : ''}
                                      </div>
                                    </div>
                                    <Badge variant={parameter.required ? 'warning' : 'secondary'}>
                                      {parameter.required ? 'Obligatoire' : 'Optionnel'}
                                    </Badge>
                                  </div>

                                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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

                                  <div className="mt-3 text-xs text-muted-foreground">
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

                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant={assignment.actif === false ? 'success' : 'danger'}
                          loading={updatingModuleId === assignment.id}
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
