import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CheckCircle, Loader2, Plus, Store, Wrench } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { moduleService } from '../../services/moduleService';
import { requestService } from '../../services/requestService';
import { storeService } from '../../services/storeService';
import { useApp } from '../../context/AppContext';
import type {
  MarketplacePublicDto,
  ModuleAssignment,
  RequestModuleSelectionDto,
  RequestStoreSelectionDto,
  StoreDto,
} from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';

const getStoreKey = (store: { storeId?: number | null; id: number }) => String(store.storeId ?? store.id);
const getStoreNumericId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;
const formatTnd = (amount: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount);

const getCatalogStoreLabel = (store: StoreDto) => store.name || `Store ${store.id}`;
const getCatalogStorePrice = (store: StoreDto) => store.price ?? 0;
const getModuleId = (assignment: ModuleAssignment) => assignment.module?.id ?? assignment.id;
const getModuleLabel = (assignment: ModuleAssignment) =>
  assignment.module?.label || assignment.module?.name || `Module ${getModuleId(assignment)}`;
const getModulePrice = (assignment: ModuleAssignment) => assignment.price ?? assignment.module?.price ?? 0;

export function BankStores() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBank, currentUser } = useApp();
  const { stores, modulesByStore, marketplace, isLoading, error, refresh } = useBankTenant();
  const [updatingStoreId, setUpdatingStoreId] = useState<number | null>(null);
  const [publicMarketplace, setPublicMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [storeCatalog, setStoreCatalog] = useState<StoreDto[]>([]);
  const [isStoreCatalogLoading, setIsStoreCatalogLoading] = useState(false);
  const [storeCatalogError, setStoreCatalogError] = useState('');
  const [storeModulesByStore, setStoreModulesByStore] = useState<Record<number, ModuleAssignment[]>>({});
  const [isStoreModulesLoading, setIsStoreModulesLoading] = useState(false);
  const [storeModulesError, setStoreModulesError] = useState('');
  const [selectedRequestStoreIds, setSelectedRequestStoreIds] = useState<number[]>([]);
  const [selectedRequestModulesByStore, setSelectedRequestModulesByStore] = useState<Record<number, number[]>>({});
  const [isSubmittingStoreRequest, setIsSubmittingStoreRequest] = useState(false);
  const [storeRequestError, setStoreRequestError] = useState('');

  const selectedStoreId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('store') || getStoreKey(stores[0] || { id: 0 });
  }, [location.search, stores]);

  const selectedStore = stores.find((store) => getStoreKey(store) === selectedStoreId) || stores[0];
  const selectedStoreKeyNumber = selectedStore ? getStoreNumericId(selectedStore) : null;
  const isSelectedStoreInactive =
    selectedStore ? selectedStore.enabled === false || selectedStore.visible === false : false;
  const activeStoresCount = useMemo(
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
        console.error('Failed to load public marketplace for stores page:', loadError);
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

  useEffect(() => {
    let mounted = true;

    const loadStoreCatalog = async () => {
      try {
        setIsStoreCatalogLoading(true);
        setStoreCatalogError('');
        const response = await storeService.getStoresByStatus('active');
        if (mounted) {
          setStoreCatalog(response.data || []);
        }
      } catch (catalogError) {
        console.error('Failed to load active stores catalog:', catalogError);
        if (mounted) {
          setStoreCatalog([]);
          setStoreCatalogError('Impossible de charger le catalogue des stores.');
        }
      } finally {
        if (mounted) {
          setIsStoreCatalogLoading(false);
        }
      }
    };

    void loadStoreCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  const assignedStoreIds = useMemo(
    () =>
      new Set(
        (stores || [])
          .map((store) => store.storeId ?? store.id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    [stores],
  );

  const availableStores = useMemo(
    () => storeCatalog.filter((store) => store.status === 'active' && !assignedStoreIds.has(store.id)),
    [storeCatalog, assignedStoreIds],
  );

  const uniqueAvailableStores = useMemo(() => {
    const byId = new Map<number, StoreDto>();
    availableStores.forEach((store) => {
      byId.set(store.id, store);
    });
    return Array.from(byId.values());
  }, [availableStores]);

  const requestableStores = useMemo(
    () => uniqueAvailableStores.filter((store) => (storeModulesByStore[store.id] || []).length > 0),
    [uniqueAvailableStores, storeModulesByStore],
  );

  useEffect(() => {
    setSelectedRequestStoreIds((current) =>
      current.filter((storeId) => uniqueAvailableStores.some((store) => store.id === storeId)),
    );
  }, [uniqueAvailableStores]);

  useEffect(() => {
    let mounted = true;

    const loadStoreModules = async () => {
      if (uniqueAvailableStores.length === 0) {
        if (mounted) {
          setStoreModulesByStore({});
        }
        return;
      }

      try {
        setIsStoreModulesLoading(true);
        setStoreModulesError('');
        const responses = await Promise.all(
          uniqueAvailableStores.map(async (store) => {
              try {
                const response = await moduleService.getActiveStoreModulesWithConfig(store.id);
                return { storeId: store.id, modules: response.data || [] };
            } catch (loadError) {
              console.error(`Failed to load modules for store ${store.id}:`, loadError);
              return { storeId: store.id, modules: [] as ModuleAssignment[] };
            }
          }),
        );

        if (!mounted) return;

        setStoreModulesByStore(
          responses.reduce<Record<number, ModuleAssignment[]>>((acc, entry) => {
            acc[entry.storeId] = entry.modules.filter((assignment) => Boolean(assignment?.module));
            return acc;
          }, {}),
        );
      } catch (loadError) {
        console.error('Failed to load modules for request modal:', loadError);
        if (mounted) {
          setStoreModulesError('Impossible de charger les modules disponibles.');
          setStoreModulesByStore({});
        }
      } finally {
        if (mounted) {
          setIsStoreModulesLoading(false);
        }
      }
    };

    void loadStoreModules();

    return () => {
      mounted = false;
    };
  }, [uniqueAvailableStores]);

  useEffect(() => {
    setSelectedRequestModulesByStore((current) => {
      const next: Record<number, number[]> = {};

      Object.entries(current).forEach(([storeIdString, moduleIds]) => {
        const storeId = Number(storeIdString);
        const availableModuleIds = (storeModulesByStore[storeId] || []).map(getModuleId);
        const filteredIds = moduleIds.filter((moduleId) => availableModuleIds.includes(moduleId));
        if (filteredIds.length > 0) {
          next[storeId] = filteredIds;
        }
      });

      return next;
    });
  }, [storeModulesByStore]);

  const visibleModulesByStore = useMemo(() => {
    return Object.entries(modulesByStore).reduce<Record<number, ModuleAssignment[]>>((acc, [storeIdString, assignments]) => {
      const storeId = Number(storeIdString);
      const publicStore = (publicMarketplace?.stores || []).find(
        (store) => (store.storeId ?? store.id) === storeId,
      );

      if (!publicStore) {
        acc[storeId] = assignments;
        return acc;
      }

      const publicModuleIds = new Set(
        (publicStore.modules || [])
          .map((module) => module.moduleId ?? module.id)
          .filter((moduleId): moduleId is number => typeof moduleId === 'number'),
      );

      acc[storeId] = assignments.filter((assignment) => {
        const moduleId = assignment.module?.id;
        return moduleId != null && publicModuleIds.has(moduleId);
      });
      return acc;
    }, {});
  }, [modulesByStore, publicMarketplace]);

  const selectedStoreModulesCount = useMemo(
    () => (selectedStoreKeyNumber != null ? (visibleModulesByStore[selectedStoreKeyNumber] || []).length : 0),
    [selectedStoreKeyNumber, visibleModulesByStore],
  );

  const getVisibleModuleCountForStore = (store: { storeId?: number | null; id: number }) => {
    const storeId = getStoreNumericId(store);
    const publicStore = (publicMarketplace?.stores || []).find(
      (entry) => (entry.storeId ?? entry.id) === storeId,
    );

    if (publicStore) {
      return (publicStore.modules || []).filter(
        (module) => module.enabled !== false && module.visible !== false,
      ).length;
    }

    return (modulesByStore[storeId] || []).filter((assignment) => assignment.actif !== false).length;
  };

  const storeModules = useMemo(() => {
    if (selectedStoreKeyNumber == null) {
      return [];
    }

    const modules = visibleModulesByStore[selectedStoreKeyNumber] || [];
    return isSelectedStoreInactive ? modules : modules.filter((assignment) => assignment.actif !== false);
  }, [isSelectedStoreInactive, selectedStoreKeyNumber, visibleModulesByStore]);

  const selectStore = (storeId: string) => {
    navigate(`/bank/stores?store=${storeId}`);
  };

  const toggleStoreStatus = async (storeId: number, currentEnabled?: boolean | null, name?: string | null) => {
    const nextEnabled = !(currentEnabled !== false);
    setUpdatingStoreId(storeId);
    try {
      await bankTenantService.updateMarketplaceStoreStatus(storeId, nextEnabled);
      toast.success(`${name || 'Le store'} a été ${nextEnabled ? 'activé' : 'désactivé'}.`);
      refresh();
    } catch (updateError) {
      console.error('Failed to update store status:', updateError);
      toast.error("Impossible de mettre à jour le statut du store.");
    } finally {
      setUpdatingStoreId(null);
    }
  };

  const openRequestModal = () => {
    setStoreRequestError('');
    setIsRequestModalOpen(true);
  };

  const toggleRequestStore = (storeId: number) => {
    const requestableModuleIds = (storeModulesByStore[storeId] || []).map(getModuleId);
    if (requestableModuleIds.length === 0) {
      return;
    }

    setSelectedRequestStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId],
    );
    setSelectedRequestModulesByStore((current) => {
      if (current[storeId]) {
        const next = { ...current };
        delete next[storeId];
        return next;
      }

      return {
        ...current,
        [storeId]: requestableModuleIds,
      };
    });
    setStoreRequestError('');
  };

  const selectedRequestStores = useMemo(
    () => uniqueAvailableStores.filter((store) => selectedRequestStoreIds.includes(store.id)),
    [uniqueAvailableStores, selectedRequestStoreIds],
  );

  const selectedModulesByStore = useMemo(() => {
    return selectedRequestStores.reduce<Record<number, ModuleAssignment[]>>((acc, store) => {
      const requestableModules = storeModulesByStore[store.id] || [];
      const selectedModuleIds = selectedRequestModulesByStore[store.id] || requestableModules.map(getModuleId);
      acc[store.id] = requestableModules.filter((assignment) => selectedModuleIds.includes(getModuleId(assignment)));
      return acc;
    }, {});
  }, [selectedRequestStores, selectedRequestModulesByStore, storeModulesByStore]);

  const hasRequestableModules = requestableStores.length > 0;

  const requestTotal = useMemo(
    () =>
      selectedRequestStores.reduce((sum, store) => {
        const storePrice = getCatalogStorePrice(store);
        const modulePrice = (selectedModulesByStore[store.id] || []).reduce(
          (moduleSum, module) => moduleSum + getModulePrice(module),
          0,
        );
        return sum + storePrice + modulePrice;
      }, 0),
    [selectedRequestStores, selectedModulesByStore],
  );

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    setStoreRequestError('');
  };

  const submitStoreRequest = async () => {
    if (selectedRequestStores.length === 0) {
      setStoreRequestError('Choisissez au moins un store disponible.');
      return;
    }

    const hasValidModules = selectedRequestStores.every((store) => (selectedModulesByStore[store.id] || []).length > 0);
    if (!hasValidModules) {
      setStoreRequestError('Choisissez au moins un module disponible pour chaque store selectionne.');
      return;
    }

    const bankName = marketplace?.bankName || currentBank?.name || '';
    const bankEmail = marketplace?.bankEmail || currentBank?.email || currentUser?.email || '';
    const contactName = currentUser?.name || marketplace?.bankName || currentBank?.name || '';
    const contactEmail = currentUser?.email || marketplace?.bankEmail || currentBank?.email || '';
    const marketplaceSlug = marketplace?.bankSlug || currentBank?.slug || '';

    if (!bankName || !bankEmail || !contactName || !contactEmail || !marketplaceSlug) {
      setStoreRequestError("Les informations de la banque ne sont pas suffisamment complètes pour envoyer la demande.");
      return;
    }

    try {
      setIsSubmittingStoreRequest(true);
      setStoreRequestError('');

      const bankId = currentBank?.id ?? marketplace?.bankId;
      if (!bankId) {
        setStoreRequestError("Impossible d'identifier la banque courante pour cette demande.");
        return;
      }

      const payload = {
        bankId,
        requestType: 'store' as const,
        bankName,
        bankEmail,
        country: marketplace?.bankCountry || currentBank?.country || 'Tunisie',
        website: marketplace?.bankWebsiteUrl || currentBank?.websiteUrl || '',
        contactName,
        contactEmail,
        contactPhone: '',
        description: marketplace?.bankDescription || currentBank?.description || '',
        bankDescription: marketplace?.bankDescription || currentBank?.description || '',
        establishmentYear: currentBank?.establishmentYear ?? currentBank?.establishedYear ?? undefined,
        marketplaceSlug,
        marketplaceDescription: marketplace?.welcomeText || marketplace?.bankDescription || currentBank?.description || '',
        primaryColor: marketplace?.primaryColor || '#2563EB',
        secondaryColor: marketplace?.secondaryColor || '#F97316',
        storeIds: selectedRequestStoreIds,
        moduleIds: selectedRequestStores.flatMap((store) =>
          (selectedModulesByStore[store.id] || []).map((module) => getModuleId(module)),
        ),
        selectedStoreDetails: selectedRequestStores.map((store) => ({
          storeId: store.id,
          storeName: getCatalogStoreLabel(store),
          storeDescription: store.description || '',
          storePrice: getCatalogStorePrice(store),
          modules: (selectedModulesByStore[store.id] || []).map((module) => ({
            moduleId: getModuleId(module),
            moduleName: getModuleLabel(module),
            moduleDescription: module.module?.description || '',
            modulePrice: getModulePrice(module),
            parameters: null,
          })) as RequestModuleSelectionDto[],
        })) as RequestStoreSelectionDto[],
        totalAmount: requestTotal,
        totalMonthlyPrice: requestTotal,
        createdBy: currentUser?.email || currentUser?.name || 'bank_back_office',
        priority: 'medium',
      };

      await requestService.createBankStoreRequest(payload);
      toast.success('Demande envoyee avec succes.');
      setSelectedRequestStoreIds([]);
      setSelectedRequestModulesByStore({});
      closeRequestModal();
    } catch (requestError) {
      console.error('Failed to submit store request:', requestError);
      const message =
        typeof requestError === 'object' && requestError && 'response' in requestError
          ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setStoreRequestError(message || "Impossible d'envoyer la demande de store.");
    } finally {
      setIsSubmittingStoreRequest(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Stores assignes</h1>
          <p className="text-muted-foreground">
            {marketplace?.bankName ? `Stores de ${marketplace.bankName}` : 'Stores assignes a la marketplace active'}
          </p>
        </div>
        <Button
          icon={<Plus className="h-5 w-5" />}
          onClick={openRequestModal}
          disabled={isStoreCatalogLoading}
        >
          Request New Store
        </Button>
      </div>

      {(error || storeCatalogError) && <p className="text-sm text-destructive">{error || storeCatalogError}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total store"
          value={stores.length}
          icon={<Store className="h-5 w-5" />}
          tone="primary"
          badge={`${stores.length} stores`}
        />
        <KpiCard
          label="Stores actives"
          value={activeStoresCount}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="success"
          badge={`${activeStoresCount} actifs`}
        />
        <KpiCard
          label="Store sélectionné"
          value={selectedStore?.name || '-'}
          icon={<Store className="h-5 w-5" />}
          tone="danger"
          badge={selectedStore ? `${selectedStoreModulesCount} modules` : 'Aucun'}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Stores visibles dans ce back office</CardTitle>
            <CardDescription>Chaque store affiche seulement ses propres modules assignes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Chargement...
              </div>
            ) : stores.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                Aucun store assigne a cette marketplace.
              </div>
            ) : (
              <div className="space-y-4">
                {stores.map((store) => {
                  const isSelected = getStoreKey(store) === selectedStoreId;
                  const bannerUrl = getBackendAssetUrl(store.banniereUrl);
                  const isEnabled = store.enabled !== false;
                  const modulesCount = getVisibleModuleCountForStore(store);

                  return (
                    <div
                      key={store.id}
                      onClick={() => selectStore(getStoreKey(store))}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectStore(getStoreKey(store));
                        }
                      }}
                      className={`text-left rounded-2xl border p-4 transition-all hover:border-primary/60 ${
                        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card'
                      } ${isEnabled ? '' : 'opacity-75'}`}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        {bannerUrl ? (
                          <img
                            src={bannerUrl}
                            alt={store.name || 'Store'}
                            className="h-12 w-12 rounded-xl border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Store className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{store.name || `Store ${store.id}`}</div>
                          <div className="text-xs text-muted-foreground">ID #{store.storeId ?? store.id}</div>
                        </div>
                      </div>
                      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                        {store.description || 'Store assigne a la marketplace courante.'}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant={isEnabled ? 'success' : 'warning'}>
                          {isEnabled ? 'Active' : 'Desactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{modulesCount} modules</span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant={isEnabled ? 'danger' : 'success'}
                          loading={updatingStoreId === store.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStoreStatus(store.id, store.enabled, store.name);
                          }}
                        >
                          {isEnabled ? 'Desactiver' : 'Activer'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details du store selectionne</CardTitle>
            <CardDescription>Informations du store et ses modules assignes</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStore ? (
              <div className="text-sm text-muted-foreground">Aucun store selectionne.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{selectedStore.name || `Store ${selectedStore.id}`}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{selectedStore.description || '-'}</div>
                    </div>
                    <Badge variant={isSelectedStoreInactive ? 'warning' : 'success'}>
                      {isSelectedStoreInactive ? 'Desactive' : 'Active'}
                    </Badge>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant={isSelectedStoreInactive ? 'success' : 'danger'}
                      loading={updatingStoreId === selectedStore.id}
                      onClick={() => toggleStoreStatus(selectedStore.id, selectedStore.enabled, selectedStore.name)}
                    >
                      {isSelectedStoreInactive ? 'Activer' : 'Desactiver'}
                    </Button>
                  </div>
                </div>

                {isSelectedStoreInactive && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                    Ce store est inactif. Ses modules sont affichés en grisé jusqu’à réactivation.
                  </div>
                )}

                <div className="space-y-3">
                  {storeModules.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                      Aucun module assigne a ce store.
                    </div>
                  ) : (
                    storeModules.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`rounded-xl border p-4 ${
                          isSelectedStoreInactive || assignment.actif === false
                            ? 'border-warning/30 bg-warning/5 opacity-80'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              isSelectedStoreInactive || assignment.actif === false
                                ? 'bg-warning/10 text-warning'
                                : 'bg-accent/10 text-accent'
                            }`}
                          >
                            <Wrench className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {assignment.module.label || assignment.module.name || `Module ${assignment.module.id}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.module.category || 'Categorie non precisee'}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant={assignment.actif === false ? 'warning' : 'success'}>
                                {assignment.actif === false ? 'Desactive' : 'Actif'}
                              </Badge>
                              <Badge variant="secondary">
                                {isSelectedStoreInactive ? 'Store inactif' : `Store: ${selectedStore.name || selectedStore.id}`}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {assignment.parameters?.length
                                ? `${assignment.parameters.length} parametre(s)`
                                : 'Aucun parametre configure'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isRequestModalOpen}
        onClose={closeRequestModal}
        title="Request New Store"
        size="xl"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Stores disponibles</h3>
            <p className="text-sm text-muted-foreground">
              Seuls les stores actifs dans le back office SaaS et non deja assignes a cette marketplace sont affiches.
            </p>
          </div>

          {isStoreCatalogLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement du catalogue...
            </div>
          ) : isStoreModulesLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des modules disponibles...
            </div>
          ) : uniqueAvailableStores.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aucun store disponible pour une nouvelle demande.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
              {uniqueAvailableStores.map((store) => {
                const isSelected = selectedRequestStoreIds.includes(store.id);
                const storePrice = getCatalogStorePrice(store);
                const requestableModules = storeModulesByStore[store.id] || [];
                const selectedModuleIds = selectedRequestModulesByStore[store.id] || requestableModules.map(getModuleId);
                const selectedModuleTotal = requestableModules
                  .filter((module) => selectedModuleIds.includes(getModuleId(module)))
                  .reduce((sum, module) => sum + getModulePrice(module), 0);
                const hasAvailableModules = requestableModules.length > 0;

                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => toggleRequestStore(store.id)}
                    disabled={!hasAvailableModules}
                    className={`flex h-full min-h-[430px] flex-col rounded-2xl border p-4 text-left transition-all ${
                      hasAvailableModules ? 'hover:border-primary/60' : 'cursor-not-allowed opacity-70'
                    } ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card'
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {isSelected ? <CheckCircle className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{getCatalogStoreLabel(store)}</div>
                        <div className="text-xs text-muted-foreground">Store actif et disponible</div>
                      </div>
                    </div>
                    <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                      {store.description || 'Store bancaire'}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={isSelected ? 'primary' : 'secondary'}>
                        {isSelected ? 'Selectionne' : 'Disponible'}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-900">
                        {store.price == null ? 'Prix non defini' : formatTnd(storePrice + selectedModuleTotal)} / mois
                      </span>
                    </div>
                    <div className="mt-4 flex flex-1 flex-col space-y-3">
                      {hasAvailableModules ? (
                        <>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Modules disponibles
                          </div>
                          <div className="space-y-2 flex-1">
                            {requestableModules.map((module, index) => {
                              const moduleId = getModuleId(module);
                              const moduleSelected = selectedModuleIds.includes(moduleId);
                              return (
                                <label
                                  key={`${store.id}-${moduleId}-${index}`}
                                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      checked={moduleSelected}
                                      onChange={() => {
                                        setSelectedRequestModulesByStore((current) => {
                                          const currentSelection = current[store.id] || requestableModules.map(getModuleId);
                                          const nextSelection = currentSelection.includes(moduleId)
                                            ? currentSelection.filter((id) => id !== moduleId)
                                            : [...currentSelection, moduleId];
                                          return {
                                            ...current,
                                            [store.id]: nextSelection,
                                          };
                                        });
                                      }}
                                    />
                                    <div>
                                      <div className="font-medium">{getModuleLabel(module)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {module.module?.category || 'Categorie non precisee'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold text-gray-900">
                                    {formatTnd(getModulePrice(module))}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                          All modules from this store are already assigned to your marketplace.
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{selectedRequestStoreIds.length} store(s) selectionne(s)</div>
                <div className="text-sm text-muted-foreground">Total mensuel estime</div>
              </div>
              <div className="text-xl font-bold text-primary">{formatTnd(requestTotal)}</div>
            </div>
            {!hasRequestableModules && (
              <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                All modules from this store are already assigned to your marketplace.
              </div>
            )}
          </div>

          {(storeRequestError || storeModulesError) && (
            <p className="text-sm text-destructive">{storeRequestError || storeModulesError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              icon={<Plus className="h-4 w-4" />}
              loading={isSubmittingStoreRequest}
              disabled={
                isSubmittingStoreRequest ||
                selectedRequestStoreIds.length === 0 ||
                availableStores.length === 0 ||
                !hasRequestableModules
              }
              onClick={submitStoreRequest}
            >
              Envoyer la demande
            </Button>
            <Button variant="outline" className="flex-1" onClick={closeRequestModal}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
