import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { bankTenantService } from '../services/bankTenantService';
import { moduleService } from '../services/moduleService';
import type { ModuleAssignment } from '../types/apiTypes';
import type { MarketplacePublicDto, MarketplaceModuleDetailDto, MarketplaceStoreDetailDto, UserDto } from '../types/apiTypes';
import { getActiveBankSlug } from '../utils/tenant';

const getStoreId = (store: MarketplaceStoreDetailDto) => store.storeId ?? store.id;

const dedupeModules = (modulesByStore: Record<number, ModuleAssignment[]>) => {
  const modulesMap = new Map<number, MarketplaceModuleDetailDto>();

  Object.values(modulesByStore).forEach((storeAssignments) => {
    storeAssignments.forEach((assignment) => {
      const moduleId = assignment.module?.id;
      if (moduleId != null && !modulesMap.has(moduleId)) {
        modulesMap.set(moduleId, {
          id: assignment.module.id,
          moduleId: assignment.module.id,
          name: assignment.module.label || assignment.module.name,
          category: assignment.module.category,
          price: assignment.price ?? assignment.module.price ?? null,
          enabled: assignment.actif,
          visible: assignment.actif,
        });
      }
    });
  });

  return Array.from(modulesMap.values());
};

export function useBankTenant(enabled = true) {
  const { currentBank } = useApp();
  const tenantSlug = getActiveBankSlug(currentBank);
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [modulesByStore, setModulesByStore] = useState<Record<number, ModuleAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadTenantData = async () => {
      if (!enabled) {
        if (mounted) {
          setIsLoading(false);
          setError('');
        }
        return;
      }

      if (!tenantSlug) {
        if (mounted) {
          setError("Impossible d'identifier la marketplace courante.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const [marketplaceData, usersData] = await Promise.all([
          bankTenantService.getMarketplaceBySlug(tenantSlug),
          bankTenantService.getMarketplaceUsers(),
        ]);

        if (!mounted) return;

        setMarketplace(marketplaceData);
        setUsers(usersData);

        const storeEntries = marketplaceData.stores || [];
        const storeIds = storeEntries
          .map((store) => getStoreId(store))
          .filter((storeId): storeId is number => typeof storeId === 'number');

        const storeModuleResponses = await Promise.all(
          storeIds.map(async (storeId) => {
            try {
              const response = await moduleService.getStoreModulesWithConfig(storeId);
              return { storeId, modules: response.data || [] };
            } catch (storeModulesError) {
              console.error(`Failed to load modules for store ${storeId}:`, storeModulesError);
              return { storeId, modules: [] as ModuleAssignment[] };
            }
          }),
        );

        if (!mounted) return;

        setModulesByStore(
          storeModuleResponses.reduce<Record<number, ModuleAssignment[]>>((acc, entry) => {
            acc[entry.storeId] = entry.modules;
            return acc;
          }, {}),
        );
      } catch (loadError) {
        console.error('Failed to load tenant back-office data:', loadError);
        if (mounted) {
          setError('Impossible de charger le back-office de la marketplace.');
          setModulesByStore({});
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadTenantData();

    return () => {
      mounted = false;
    };
  }, [enabled, tenantSlug, reloadIndex]);

  const stores = useMemo(() => marketplace?.stores || [], [marketplace]);
  const modules = useMemo(() => dedupeModules(modulesByStore), [modulesByStore]);

  const branding = useMemo(() => ({
    primary_color: marketplace?.primaryColor || '#2563eb',
    secondary_color: marketplace?.secondaryColor || '#f97316',
    homepage_title: marketplace?.homepageTitle || `Bienvenue sur la marketplace de ${marketplace?.bankName || tenantSlug || ''}`.trim(),
    welcome_text: marketplace?.welcomeText || marketplace?.bankDescription || 'Decouvrez nos solutions de financement.',
    banner_image_url: marketplace?.banniereUrl || marketplace?.bannerImageUrl || '',
    footer_text: marketplace?.footerText || `(c) ${new Date().getFullYear()} ${marketplace?.bankName || tenantSlug || 'Matchia'}. Tous droits reserves.`,
    logo_image_url: marketplace?.logoImageUrl || marketplace?.bankLogoUrl || '',
  }), [marketplace, tenantSlug]);

  const refresh = () => {
    setReloadIndex((current) => current + 1);
  };

  return {
    tenantSlug,
    marketplace,
    users,
    stores,
    modules,
    modulesByStore,
    branding,
    isLoading,
    error,
    refresh,
  };
}
