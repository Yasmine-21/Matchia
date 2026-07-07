import '../../styles/JoinPage.css';
import { ChangeEvent, CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import {
  AlertCircle,
  CalendarDays,
  Building2,
  Check,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Link2,
  Pencil,
  Plus,
  Palette,
  Save,
  Store as StoreIcon,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { bankService } from '../../services/bankService';
import { storeService } from '../../services/storeService';
import { moduleService } from '../../services/moduleService';
import apiClient from '../../api/apiClient';
import { Bank } from '../../types';
import { ModuleAssignment, StoreDto } from '../../types/apiTypes';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const STORE_BASE_PRICE = 100;
const MODULE_BASE_PRICE = 50;

interface MarketplaceForm {
  bankId: string;
  marketplaceSlug: string;
  marketplaceDescription: string;
  primaryColor: string;
  secondaryColor: string;
  banniereUrl: string;
  banniereFile: File | null;
  storeIds: number[];
  selectedModulesByStore: Record<number, number[]>;
}

interface MarketplaceVisualConfig {
  id: number;
  bankId: number;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  banniereUrl?: string | null;
  bannerImageUrl?: string | null;
  totalMonthlyPrice?: number | string | null;
  status?: 'active' | 'inactive' | string | null;
  welcomeText?: string | null;
  createdAt?: string | null;
  assignedStoresCount?: number | null;
  stores?: MarketplaceStoreDetail[];
}

interface MarketplaceStoreDetail {
  id: number;
  storeId?: number | null;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
  modules?: MarketplaceModuleDetail[];
}

interface MarketplaceModuleDetail {
  id: number;
  moduleId?: number | null;
  name?: string | null;
  category?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
}

const getLogoUrl = (logoUrl?: string | null) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `http://localhost:8081${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
};

const statusLabel = (status?: string) => {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'inactive':
      return 'Inactif';
    case 'pending':
      return 'En attente';
    case 'suspended':
      return 'Suspendu';
    case 'rejected':
      return 'Rejete';
    default:
      return 'Inconnu';
  }
};

const statusVariant = (status?: string) => (
  status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'secondary'
);

const marketplaceStoresCount = (marketplace?: MarketplaceVisualConfig | null) => (
  marketplace?.assignedStoresCount ?? marketplace?.stores?.length ?? 0
);

const marketplaceTariff = (marketplace?: MarketplaceVisualConfig | null) => {
  const assignedStores = marketplaceStoresCount(marketplace);
  return 74 + Math.max(assignedStores - 1, 0) * 25;
};

const DEFAULT_MARKETPLACE_COLORS = ['#2563EB', '#F97316'];

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
};

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getStoreLabel = (store: StoreDto) => store.name || `Store ${store.id}`;

const getStorePrice = (store: StoreDto) => store.price ?? STORE_BASE_PRICE;

const getModulePrice = (assignment: ModuleAssignment) => assignment.price ?? assignment.module.price ?? MODULE_BASE_PRICE;

const formatTnd = (amount: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount);

function BankLogo({ bank }: { bank: Bank }) {
  const [hasError, setHasError] = useState(false);
  const src = !hasError ? getLogoUrl(bank.logoUrl || bank.logo_url) : null;

  useEffect(() => {
    setHasError(false);
  }, [bank.logoUrl, bank.logo_url]);

  if (!src) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-orange-50 text-orange-500">
        <Building2 className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={bank.name}
      className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 bg-white object-contain p-1"
      onError={() => setHasError(true)}
    />
  );
}

export function Marketplaces() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [marketplacesByBank, setMarketplacesByBank] = useState<Record<number, MarketplaceVisualConfig>>({});
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [modulesByStore, setModulesByStore] = useState<Record<number, ModuleAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarketplace, setEditingMarketplace] = useState<MarketplaceVisualConfig | null>(null);
  const [detailsBank, setDetailsBank] = useState<Bank | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingMarketplaceId, setDeletingMarketplaceId] = useState<number | null>(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<MarketplaceForm>({
    bankId: '',
    marketplaceSlug: '',
    marketplaceDescription: '',
    primaryColor: '#2563EB',
    secondaryColor: '#F97316',
    banniereUrl: '',
    banniereFile: null,
    storeIds: [],
    selectedModulesByStore: {},
  });

  const loadBanks = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [banksData, marketplacesResponse] = await Promise.all([
        bankService.getAllBanks(),
        apiClient.get<MarketplaceVisualConfig[]>('/api/admin/marketplaces'),
      ]);
      const marketplacesMap = marketplacesResponse.data.reduce<Record<number, MarketplaceVisualConfig>>((acc, marketplace) => {
        if (!marketplace.bankId) return acc;
        acc[marketplace.bankId] = marketplace;
        return acc;
      }, {});

      setBanks(banksData);
      setMarketplacesByBank(marketplacesMap);
    } catch (loadError) {
      console.error('Failed to load marketplace banks:', loadError);
      setError("Impossible de charger les banques.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
  }, []);

  const loadCatalog = async () => {
    try {
      setIsCatalogLoading(true);
      const storesResponse = await storeService.getAllStores();
      setStores(storesResponse.data);
    } catch (catalogError) {
      console.error('Failed to load stores/modules:', catalogError);
      setFormError('Impossible de charger les stores.');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const loadModulesForStore = async (storeId: number) => {
    if (modulesByStore[storeId]) return;

    try {
      const response = await moduleService.getActiveStoreModulesWithConfig(storeId);
      setModulesByStore((prev) => ({
        ...prev,
        [storeId]: response.data.filter((assignment) => assignment.module.status === 'active'),
      }));
    } catch (moduleError) {
      console.error(`Failed to load modules for store ${storeId}:`, moduleError);
      setModulesByStore((prev) => ({ ...prev, [storeId]: [] }));
    }
  };

  const selectedBank = banks.find((bank) => String(bank.id) === form.bankId);
  const selectedStores = useMemo(
    () => stores.filter((store) => form.storeIds.includes(store.id)),
    [stores, form.storeIds],
  );
  const selectedModuleIds = useMemo(
    () => Array.from(new Set(Object.values(form.selectedModulesByStore).flat())),
    [form.selectedModulesByStore],
  );
  const totalPayment = useMemo(() => {
    const storesTotal = selectedStores.reduce((sum, store) => sum + getStorePrice(store), 0);
    const modulesTotal = selectedStores.reduce((sum, store) => {
      const selectedForStore = form.selectedModulesByStore[store.id] || [];
      const storeModules = modulesByStore[store.id] || [];

      return sum + storeModules
        .filter((assignment) => selectedForStore.includes(assignment.module.id))
        .reduce((moduleSum, assignment) => moduleSum + getModulePrice(assignment), 0);
    }, 0);

    return storesTotal + modulesTotal;
  }, [form.selectedModulesByStore, modulesByStore, selectedStores]);
  const selectedStoreDetails = useMemo(
    () =>
      selectedStores.map((store) => {
        const selectedForStore = form.selectedModulesByStore[store.id] || [];
        const storeModules = modulesByStore[store.id] || [];
        const selectedAssignments = storeModules.filter((assignment) =>
          selectedForStore.includes(assignment.module.id),
        );

        return {
          storeId: store.id,
          storeName: getStoreLabel(store),
          storeDescription: store.description || '',
          storePrice: getStorePrice(store),
          modules: selectedAssignments.map((assignment) => ({
            moduleId: assignment.module.id,
            moduleName: assignment.module.label || assignment.module.name,
            moduleDescription: assignment.module.description || '',
            modulePrice: getModulePrice(assignment),
            parameters: assignment.parameters?.length ? JSON.stringify(assignment.parameters) : null,
          })),
        };
      }),
    [form.selectedModulesByStore, modulesByStore, selectedStores],
  );
  const marketplaceStyle: CSSProperties & Record<string, string> = {
    '--marketplace-primary': form.primaryColor,
    '--marketplace-secondary': form.secondaryColor,
  };
  const marketplaceList = Object.values(marketplacesByBank);
  const activeMarketplaces = marketplaceList.filter((marketplace) => marketplace.status === 'active').length;
  const inactiveMarketplaces = marketplaceList.filter((marketplace) => marketplace.status !== 'active').length;
  const monthlyRevenue = banks
    .filter((bank) => marketplacesByBank[bank.id]?.status === 'active')
    .reduce((sum, bank) => {
      const marketplace = marketplacesByBank[bank.id];
      return sum + (toNumber(marketplace?.totalMonthlyPrice) ?? marketplaceTariff(marketplace));
    }, 0);
  const detailsMarketplace = detailsBank ? marketplacesByBank[detailsBank.id] : null;
  const detailsSelectedStores: MarketplaceStoreDetail[] = detailsMarketplace?.stores || [];
  const detailsPrimaryColor = detailsMarketplace?.primaryColor || DEFAULT_MARKETPLACE_COLORS[0];
  const detailsSecondaryColor = detailsMarketplace?.secondaryColor || DEFAULT_MARKETPLACE_COLORS[1];
  const detailsMonthlyPrice = detailsBank
    ? toNumber(detailsMarketplace?.totalMonthlyPrice)
      ?? marketplaceTariff(detailsMarketplace)
    : 0;
  const detailsStoresCount = detailsSelectedStores.length || marketplaceStoresCount(detailsMarketplace);

  const openDetailsModal = async (bank: Bank) => {
    setDetailsBank(bank);
    const marketplace = marketplacesByBank[bank.id];
    const storeIds = (marketplace?.stores || [])
      .map((store) => store.storeId)
      .filter((storeId): storeId is number => typeof storeId === 'number');
    await Promise.all(storeIds.map((storeId) => loadModulesForStore(storeId)));
  };

  const openCreateModal = () => {
    const firstBank = banks[0];
    setEditingMarketplace(null);
    setFormError('');
    setForm({
      bankId: firstBank?.id ? String(firstBank.id) : '',
      marketplaceSlug: firstBank?.slug || '',
      marketplaceDescription: firstBank?.description || '',
      primaryColor: '#2563EB',
      secondaryColor: '#F97316',
      banniereUrl: '',
      banniereFile: null,
      storeIds: [],
      selectedModulesByStore: {},
    });
    setIsModalOpen(true);
    if (stores.length === 0) {
      loadCatalog();
    }
  };

  const openEditModal = async (marketplace: MarketplaceVisualConfig | undefined, bank: Bank) => {
    if (!marketplace?.id) {
      alert("Cette marketplace n'est pas encore configurable.");
      return;
    }

    const storeIds = (marketplace.stores || [])
      .map((store) => store.storeId)
      .filter((storeId): storeId is number => typeof storeId === 'number');
    const selectedModulesByStore = (marketplace.stores || []).reduce<Record<number, number[]>>((acc, store) => {
      if (typeof store.storeId !== 'number') return acc;
      acc[store.storeId] = (store.modules || [])
        .map((module) => module.moduleId)
        .filter((moduleId): moduleId is number => typeof moduleId === 'number');
      return acc;
    }, {});

    setEditingMarketplace(marketplace);
    setFormError('');
    setForm({
      bankId: String(bank.id),
      marketplaceSlug: bank.slug || '',
      marketplaceDescription: marketplace.welcomeText || bank.description || '',
      primaryColor: marketplace.primaryColor || DEFAULT_MARKETPLACE_COLORS[0],
      secondaryColor: marketplace.secondaryColor || DEFAULT_MARKETPLACE_COLORS[1],
      banniereUrl: marketplace.banniereUrl || marketplace.bannerImageUrl || '',
      banniereFile: null,
      storeIds,
      selectedModulesByStore,
    });
    setIsModalOpen(true);

    if (stores.length === 0) {
      await loadCatalog();
    }
    await Promise.all(storeIds.map((storeId) => loadModulesForStore(storeId)));
  };

  const handleStatusToggle = async (marketplace: MarketplaceVisualConfig | undefined, bank: Bank) => {
    if (!marketplace?.id || updatingStatusIds.has(marketplace.id)) {
      return;
    }

    const currentStatus = marketplace.status === 'active' ? 'active' : 'inactive';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    setUpdatingStatusIds((prev) => new Set(prev).add(marketplace.id));
    setMarketplacesByBank((prev) => ({
      ...prev,
      [bank.id]: {
        ...marketplace,
        status: nextStatus,
      },
    }));

    try {
      const response = await apiClient.patch<MarketplaceVisualConfig>(`/api/admin/marketplaces/${marketplace.id}/status`, {
        status: nextStatus,
      });

      setMarketplacesByBank((prev) => ({
        ...prev,
        [bank.id]: response.data,
      }));
    } catch (statusError) {
      console.error('Failed to update marketplace status:', statusError);
      setMarketplacesByBank((prev) => ({
        ...prev,
        [bank.id]: marketplace,
      }));
      alert("Impossible de modifier le statut de la marketplace.");
    } finally {
      setUpdatingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(marketplace.id);
        return next;
      });
    }
  };

  const updateBankSelection = (bankId: string) => {
    const bank = banks.find((item) => String(item.id) === bankId);
    setForm((prev) => ({
      ...prev,
      bankId,
      marketplaceSlug: bank?.slug || prev.marketplaceSlug,
      marketplaceDescription: bank?.description || prev.marketplaceDescription,
    }));
    setFormError('');
  };

  const updateSlug = (value: string) => {
    setForm((prev) => ({
      ...prev,
      marketplaceSlug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
    }));
    setFormError('');
  };

  const validateForm = () => {
    if (!form.bankId) return 'Selectionnez une banque.';
    if (!form.marketplaceSlug.trim()) return 'Le slug marketplace est obligatoire.';
    if (!SLUG_PATTERN.test(form.marketplaceSlug.trim())) return 'Le slug doit contenir uniquement des minuscules, chiffres et tirets.';
    if (form.marketplaceDescription.length > 500) return 'La description ne doit pas depasser 500 caracteres.';
    if (!HEX_COLOR_PATTERN.test(form.primaryColor)) return 'La couleur primaire est invalide.';
    if (!HEX_COLOR_PATTERN.test(form.secondaryColor)) return 'La couleur secondaire est invalide.';
    if (form.storeIds.length === 0) return 'Selectionnez au moins un store.';
    if (selectedModuleIds.length === 0) return 'Selectionnez au moins un module.';
    return '';
  };

  const handleBanniereChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('La banniere ne doit pas depasser 5 Mo.');
      event.target.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, banniereFile: file }));
    setFormError('');
  };

  const uploadBanniereIfNeeded = async () => {
    if (!form.banniereFile) {
      return form.banniereUrl;
    }

    const formData = new FormData();
    formData.append('banniere', form.banniereFile);

    const response = await apiClient.post<{ banniereUrl: string }>('/api/admin/marketplaces/upload-banniere', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.banniereUrl;
  };

  const toggleStore = async (storeId: number) => {
    const isSelected = form.storeIds.includes(storeId);

    setForm((prev) => {
      const nextModulesByStore = { ...prev.selectedModulesByStore };
      if (isSelected) {
        delete nextModulesByStore[storeId];
      } else if (!Object.prototype.hasOwnProperty.call(nextModulesByStore, storeId)) {
        nextModulesByStore[storeId] = [];
      }

      return {
        ...prev,
        storeIds: isSelected
          ? prev.storeIds.filter((id) => id !== storeId)
          : [...prev.storeIds, storeId],
        selectedModulesByStore: nextModulesByStore,
      };
    });
    setFormError('');

    if (!isSelected) {
      await loadModulesForStore(storeId);
    }
  };

  const toggleModule = (storeId: number, moduleId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedModulesByStore: {
        ...prev.selectedModulesByStore,
        [storeId]: (prev.selectedModulesByStore[storeId] || []).includes(moduleId)
          ? (prev.selectedModulesByStore[storeId] || []).filter((id) => id !== moduleId)
          : [...(prev.selectedModulesByStore[storeId] || []), moduleId],
      },
    }));
    setFormError('');
  };

  const handleSubmitMarketplace = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      const banniereUrl = await uploadBanniereIfNeeded();
      const payload = {
        bankId: Number(form.bankId),
        marketplaceSlug: form.marketplaceSlug.trim(),
        marketplaceDescription: form.marketplaceDescription.trim(),
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        banniereUrl,
        totalMonthlyPrice: totalPayment,
        storeIds: form.storeIds,
        moduleIds: selectedModuleIds,
        selectedStores: selectedStoreDetails,
        selectedModulesByStore: form.selectedModulesByStore,
      };

      if (editingMarketplace?.id) {
        await apiClient.put(`/api/admin/marketplaces/${editingMarketplace.id}`, payload);
      } else {
        await apiClient.post('/api/admin/marketplaces', payload);
      }

      setIsModalOpen(false);
      setEditingMarketplace(null);
      await loadBanks();
      alert(editingMarketplace ? 'Marketplace modifiee avec succes.' : 'Marketplace creee avec succes.');
    } catch (saveError) {
      console.error('Failed to create marketplace:', saveError);
      setFormError(editingMarketplace
        ? "Impossible de modifier la marketplace. Verifiez les donnees saisies."
        : "Impossible de creer la marketplace. Verifiez le slug et la banque selectionnee.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMarketplace = async (marketplace: MarketplaceVisualConfig | undefined, bank: Bank) => {
    if (!marketplace?.id) {
      alert("Cette marketplace n'est pas encore configurable.");
      return;
    }
    if (!window.confirm(`Supprimer la marketplace ${bank.slug || bank.name} ?`)) {
      return;
    }

    try {
      setDeletingMarketplaceId(marketplace.id);
      await apiClient.delete(`/api/admin/marketplaces/${marketplace.id}`);
      setMarketplacesByBank((prev) => {
        const next = { ...prev };
        delete next[bank.id];
        return next;
      });
      await loadBanks();
    } catch (deleteError) {
      console.error('Failed to delete marketplace:', deleteError);
      alert("Impossible de supprimer la marketplace.");
    } finally {
      setDeletingMarketplaceId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-4xl font-bold tracking-normal text-gray-950">Marketplace</h1>
        <p className="mt-3 text-lg text-slate-600">Gerez les marketplaces de vos banques partenaires</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Marketplaces actives"
          value={activeMarketplaces}
          icon={<StoreIcon className="h-5 w-5" />}
          tone="warning"
          badge={`${activeMarketplaces} marketplaces`}
        />
        <KpiCard
          label="Revenus mensuels"
          value={`${monthlyRevenue} DT`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
          badge="CA estimé"
        />
        <KpiCard
          label="Marketplace inactive"
          value={inactiveMarketplaces}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
          badge={`${inactiveMarketplaces} marketplaces`}
        />
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-none">
        <CardHeader className="flex flex-col gap-4 px-7 pt-7 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-950">Liste des Marketplaces</CardTitle>
            <p className="mt-1 text-base text-slate-600">Gerez les marketplaces de vos banques avec leurs configurations</p>
          </div>
          <Button variant="primary" className="bg-blue-600 px-6 py-3 text-base font-semibold hover:bg-blue-700" onClick={openCreateModal}>
            <Plus className="h-5 w-5" /> Nouvelle Marketplace
          </Button>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des marketplaces...
            </div>
          ) : marketplaceList.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Aucune marketplace disponible.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-base font-bold text-gray-950">
                    <th className="px-3 py-4">Marketplace</th>
                    <th className="px-3 py-4">Banque</th>
                    <th className="px-3 py-4">Couleurs</th>
                    <th className="px-3 py-4">Stores</th>
                    <th className="px-3 py-4">Tarif/mois</th>
                    <th className="px-3 py-4">CrÃ©ation</th>
                    <th className="px-3 py-4">Statut</th>
                    <th className="px-3 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.filter((bank) => marketplacesByBank[bank.id]).map((bank) => {
                    const marketplace = marketplacesByBank[bank.id];
                    const primaryColor = marketplace?.primaryColor || DEFAULT_MARKETPLACE_COLORS[0];
                    const secondaryColor = marketplace?.secondaryColor || DEFAULT_MARKETPLACE_COLORS[1];
                    const monthlyPrice = toNumber(marketplace?.totalMonthlyPrice) ?? marketplaceTariff(marketplace);
                    const assignedStores = marketplaceStoresCount(marketplace);
                    const currentStatus = marketplace?.status || bank.status;
                    const isActive = currentStatus === 'active';
                    const isStatusUpdating = marketplace?.id ? updatingStatusIds.has(marketplace.id) : false;
                    const isDeleting = marketplace?.id ? deletingMarketplaceId === marketplace.id : false;

                    return (
                      <tr key={bank.id} className="border-b border-slate-200 text-base text-gray-950">
                        <td className="px-3 py-4 font-bold">{bank.slug || bank.name}</td>
                        <td className="px-3 py-4">{bank.name}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-md" style={{ backgroundColor: primaryColor }} />
                            <span className="h-7 w-7 rounded-md" style={{ backgroundColor: secondaryColor }} />
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-5">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                              {assignedStores}
                            </span>
                            <button
                              type="button"
                              onClick={() => openDetailsModal(bank)}
                              className="rounded-md p-1 text-slate-700 transition-colors hover:bg-slate-100"
                              aria-label={`Voir les details de ${bank.name}`}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4 font-bold">{formatTnd(monthlyPrice)}</td>
                        <td className="px-3 py-4 text-slate-600">{formatDate(marketplace?.createdAt)}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-medium ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {statusLabel(currentStatus)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(marketplace, bank)}
                              disabled={!marketplace?.id || isStatusUpdating}
                              className={`relative h-7 w-14 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                              aria-label={`Statut ${bank.name}`}
                            >
                              <span
                                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                                  isActive ? 'translate-x-7' : 'translate-x-0'
                                } ${isStatusUpdating ? 'animate-pulse' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-7">
                            <button
                              type="button"
                              onClick={() => openEditModal(marketplace, bank)}
                              disabled={!marketplace?.id || isDeleting}
                              className="text-slate-800 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Modifier ${bank.name}`}
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMarketplace(marketplace, bank)}
                              disabled={!marketplace?.id || isDeleting}
                              className="text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Supprimer ${bank.name}`}
                            >
                              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={detailsBank !== null}
        onClose={() => {
          setDetailsBank(null);
        }}
        size="xl"
      >
        {detailsBank && (
          <div className="space-y-6 text-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 pr-10 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="scale-110 origin-left">
                  <BankLogo bank={detailsBank} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-bold tracking-tight text-slate-900">
                    {detailsBank.slug || detailsBank.name}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />
                    <span>{detailsBank.name}</span>
                  </div>
                </div>
              </div>
              <Badge
                variant={statusVariant(detailsMarketplace?.status || detailsBank.status)}
                className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-emerald-700 ring-1 ring-emerald-200"
              >
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {statusLabel(detailsMarketplace?.status || detailsBank.status)}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-200">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">Banque</div>
                    <div className="mt-1 truncate text-lg font-bold text-slate-900">{detailsBank.name}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">Slug marketplace</div>
                    <div className="mt-1 truncate text-lg font-bold text-slate-900">{detailsBank.slug || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-slate-200">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">CrÃ©ation</div>
                    <div className="mt-1 truncate text-lg font-bold text-slate-900">{formatDate(detailsMarketplace?.createdAt)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <StoreIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">Stores assignÃ©s</div>
                    <div className="mt-1 truncate text-lg font-bold text-slate-900">{detailsStoresCount}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">Tarif mensuel</div>
                    <div className="mt-1 truncate text-lg font-bold text-slate-900">{formatTnd(detailsMonthlyPrice)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <StoreIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Stores assignes</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {detailsStoresCount} store{detailsStoresCount > 1 ? 's' : ''} assigne{detailsStoresCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  Total : <span className="text-blue-600">{formatTnd(detailsMonthlyPrice)}</span>
                </div>
              </div>

              {detailsSelectedStores.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Aucun store assigne a cette marketplace.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {detailsSelectedStores.map((store) => {
                    const modules = store.modules || [];

                    return (
                      <div key={store.id || store.storeId} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 ring-1 ring-slate-200">
                            <StoreIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold text-slate-900">
                              {store.name || `Store ${store.storeId || store.id}`}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {store.description || 'Store associe a cette marketplace'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Modules assignes
                          </div>
                          {modules.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                              Aucun module assigne a ce store.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {modules.map((module) => (
                                <div key={module.id || module.moduleId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {module.name || `Module ${module.moduleId || module.id}`}
                                    </div>
                                    {module.category && (
                                      <div className="mt-0.5 text-xs text-slate-500">{module.category}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Palette className="h-4 w-4 text-blue-600" />
                  <span>Couleurs marketplace</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-md border border-slate-200" style={{ backgroundColor: detailsPrimaryColor }} />
                    <span className="text-sm font-semibold text-slate-900">{detailsPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-md border border-slate-200" style={{ backgroundColor: detailsSecondaryColor }} />
                    <span className="text-sm font-semibold text-slate-900">{detailsSecondaryColor}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Description</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  {detailsBank.description || detailsMarketplace?.welcomeText || 'Aucune description disponible.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={`http://${detailsBank.slug}.lvh.me:5173`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition-colors hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir la marketplace
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSaving) {
            setIsModalOpen(false);
            setEditingMarketplace(null);
          }
        }}
        title={editingMarketplace ? 'Modifier Marketplace' : 'Creer Marketplace'}
        size="lg"
      >
        <form onSubmit={handleSubmitMarketplace} className="space-y-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Banque</label>
                <select
                  value={form.bankId}
                  onChange={(event) => updateBankSelection(event.target.value)}
                  disabled={Boolean(editingMarketplace)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {banks.length === 0 ? (
                    <option value="">Aucune banque disponible</option>
                  ) : banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Slug marketplace</label>
                <div className="flex rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
                  <input
                    value={form.marketplaceSlug}
                    onChange={(event) => updateSlug(event.target.value)}
                    className="min-w-0 flex-1 rounded-l-lg bg-transparent px-4 py-2.5 text-sm outline-none"
                    placeholder="ma-banque"
                  />
                  <span className="flex items-center rounded-r-lg bg-muted px-3 text-sm text-muted-foreground">
                    .lvh.me
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Description marketplace</label>
                <textarea
                  value={form.marketplaceDescription}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, marketplaceDescription: event.target.value }));
                    setFormError('');
                  }}
                  rows={5}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Description visible dans la marketplace"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {form.marketplaceDescription.length}/500
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Couleur primaire</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(event) => setForm((prev) => ({ ...prev, primaryColor: event.target.value.toUpperCase() }))}
                      className="h-10 w-12 cursor-pointer rounded border border-border bg-white"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={(event) => setForm((prev) => ({ ...prev, primaryColor: event.target.value.toUpperCase() }))}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Couleur secondaire</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(event) => setForm((prev) => ({ ...prev, secondaryColor: event.target.value.toUpperCase() }))}
                      className="h-10 w-12 cursor-pointer rounded border border-border bg-white"
                    />
                    <input
                      value={form.secondaryColor}
                      onChange={(event) => setForm((prev) => ({ ...prev, secondaryColor: event.target.value.toUpperCase() }))}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="marketplace-banniere">
                  Banniere marketplace
                </label>
                <label
                  htmlFor="marketplace-banniere"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <input
                    id="marketplace-banniere"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={handleBanniereChange}
                  />
                  {form.banniereFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
                      <div className="text-sm font-semibold text-gray-900">{form.banniereFile.name}</div>
                      <div className="text-xs text-slate-500">La nouvelle image sera envoyee a la sauvegarde.</div>
                    </div>
                  ) : form.banniereUrl ? (
                    <div className="w-full space-y-3">
                      <img
                        src={getLogoUrl(form.banniereUrl) || ''}
                        alt="Banniere marketplace"
                        className="h-32 w-full rounded-lg border border-slate-200 bg-white object-cover"
                      />
                      <div className="text-xs text-slate-500">Cliquez pour remplacer la banniere.</div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <div className="mt-2 text-sm font-semibold text-gray-900">Importer une banniere</div>
                      <div className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP ou SVG (max. 5 Mo)</div>
                    </>
                  )}
                </label>
                {(form.banniereFile || form.banniereUrl) && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, banniereFile: null, banniereUrl: '' }))}
                    className="mt-2 text-sm font-medium text-red-500 transition-colors hover:text-red-600"
                  >
                    Supprimer la banniere
                  </button>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stores a inclure</CardTitle>
                  <p className="text-sm text-muted-foreground">Choisissez les boutiques a publier dans cette marketplace.</p>
                </CardHeader>
                <CardContent>
                  {isCatalogLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Chargement du catalogue...
                    </div>
                  ) : stores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun store disponible.</p>
                  ) : (
                    <div className="join-form-grid">
                      {stores.map((store) => {
                        const isSelected = form.storeIds.includes(store.id);

                        return (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => toggleStore(store.id)}
                            className={`join-selection-card text-left ${isSelected ? 'join-selection-card-active' : ''}`}
                            style={marketplaceStyle}
                          >
                            <div className="join-selection-content">
                              <div className={`join-selection-icon-wrapper ${isSelected ? 'join-selection-icon-wrapper-active' : ''}`}>
                                {isSelected ? <CheckCircle className="join-selection-icon" /> : <StoreIcon className="join-selection-icon" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="join-selection-title-row">
                                  <h4 className="join-selection-title">{getStoreLabel(store)}</h4>
                                  {isSelected && <span className="join-selected-badge">Selectionne</span>}
                                </div>
                                <p className="join-price-line">{formatTnd(getStorePrice(store))} / mois</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedStores.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Selectionnez une boutique pour afficher ses modules.
                  </CardContent>
                </Card>
              ) : selectedStores.map((store) => {
                const storeModules = modulesByStore[store.id] || [];
                const selectedForStore = form.selectedModulesByStore[store.id] || [];

                return (
                  <Card key={store.id}>
                    <CardHeader>
                      <CardTitle>Modules pour {getStoreLabel(store)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choisissez les modules actifs lies a cette boutique.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {!modulesByStore[store.id] ? (
                        <div className="flex items-center py-6 text-muted-foreground">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Chargement des modules...
                        </div>
                      ) : storeModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun module actif associe.</p>
                      ) : (
                        <div className="join-form-grid">
                          {storeModules.map((assignment) => {
                            const isSelected = selectedForStore.includes(assignment.module.id);

                            return (
                              <button
                                key={assignment.id}
                                type="button"
                                onClick={() => toggleModule(store.id, assignment.module.id)}
                                className={`join-module-card text-left ${isSelected ? 'join-module-card-active' : ''}`}
                                style={marketplaceStyle}
                              >
                                <div className="join-success-item">
                                  <div className={`join-module-icon-wrapper ${isSelected ? 'join-module-icon-wrapper-active' : ''}`}>
                                    {isSelected ? <Check className="join-stepper-icon" /> : <Wrench className="join-stepper-icon" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="join-selection-title-row">
                                      <h4 className="mb-1 font-semibold">{assignment.module.label || assignment.module.name}</h4>
                                      {isSelected && <span className="join-selected-badge">Selectionne</span>}
                                    </div>
                                    <p className="join-price-line">{formatTnd(getModulePrice(assignment))} / mois</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-3">
                {selectedBank ? <BankLogo bank={selectedBank} /> : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-gray-900">{selectedBank?.name || 'Banque'}</div>
                  <div className="truncate text-xs text-gray-500">{form.marketplaceSlug || 'slug'}.lvh.me</div>
                </div>
              </div>
              <div
                className="rounded-lg p-4 text-white"
                style={{ backgroundColor: form.primaryColor }}
              >
                <div className="text-lg font-bold">Marketplace {selectedBank?.name || ''}</div>
                <p className="mt-2 line-clamp-4 text-sm opacity-90">
                  {form.marketplaceDescription || 'Description marketplace'}
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-md px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: form.secondaryColor }}
                >
                  Decouvrir
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-gray-900">{form.storeIds.length}</div>
                  <div className="text-xs text-muted-foreground">Stores</div>
                </div>
                <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-gray-900">{selectedModuleIds.length}</div>
                  <div className="text-xs text-muted-foreground">Modules</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="text-sm font-medium text-orange-700">Total paiement mensuel</div>
                <div className="mt-2 text-3xl font-bold text-orange-600">{formatTnd(totalPayment)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Stores et modules selectionnes</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total estime : </span>
              <strong>{formatTnd(totalPayment)} / mois</strong>
            </div>
            <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingMarketplace(null);
              }}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button type="submit" icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} disabled={isSaving}>
              {isSaving
                ? (editingMarketplace ? 'Modification...' : 'Creation...')
                : (editingMarketplace ? 'Sauvegarder les modifications' : 'Creer Marketplace')}
            </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

