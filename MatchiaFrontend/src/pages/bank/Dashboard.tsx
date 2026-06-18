import '../../styles/BankDashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Store, Box, TrendingUp, Loader2, Users, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { requestService } from '../../services/requestService';
import type { MarketplacePublicDto, ModuleAssignment } from '../../types/apiTypes';
import { KpiCard } from '../../components/ui/KpiCard';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444'];

const getStoreId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;

export function BankDashboard() {
  const { users, stores, modulesByStore, marketplace, isLoading, error } = useBankTenant();
  const navigate = useNavigate();
  const [publicMarketplace, setPublicMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  const activeStores = useMemo(
    () => stores.filter((store) => store.visible !== false && store.enabled !== false),
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
        console.error('Failed to load public marketplace for dashboard:', loadError);
        if (mounted) {
          setPublicMarketplace(null);
        }
      }
    };

    loadPublicMarketplace();

    return () => {
      mounted = false;
    };
  }, [marketplace?.bankSlug]);

  useEffect(() => {
    const tenantBankId = marketplace?.bankId;
    if (!tenantBankId) {
      setRequestCount(0);
      return;
    }

    let mounted = true;

    const loadRequests = async () => {
      try {
        const response = await requestService.getBankRequests(tenantBankId);
        if (!mounted) return;
        setRequestCount(
          response.data.filter((request) => request.requestType === 'store' || request.requestType === 'module').length,
        );
      } catch (loadError) {
        console.error('Failed to load bank request count:', loadError);
        if (mounted) {
          setRequestCount(0);
        }
      }
    };

    void loadRequests();

    return () => {
      mounted = false;
    };
  }, [marketplace?.bankId]);

  const visibleModulesByStore = useMemo(() => {
    return Object.entries(modulesByStore).reduce<Record<number, ModuleAssignment[]>>((acc, [storeIdString, assignments]) => {
      const storeId = Number(storeIdString);
      const publicStore = (publicMarketplace?.stores || []).find(
        (store) => (store.storeId ?? store.id) === storeId,
      );

      if (!publicStore) {
        acc[storeId] = assignments.filter((assignment) => assignment.actif !== false);
        return acc;
      }

      const publicModuleIds = new Set(
        (publicStore.modules || [])
          .map((module) => module.moduleId ?? module.id)
          .filter((moduleId): moduleId is number => typeof moduleId === 'number'),
      );

      acc[storeId] = assignments.filter((assignment) => {
        const moduleId = assignment.module?.id;
        return assignment.actif !== false && moduleId != null && publicModuleIds.has(moduleId);
      });
      return acc;
    }, {});
  }, [modulesByStore, publicMarketplace]);

  const visibleModuleCount = useMemo(
    () => Object.values(visibleModulesByStore).reduce((count, assignments) => count + assignments.length, 0),
    [visibleModulesByStore],
  );

  const activeModuleCount = useMemo(
    () =>
      Object.values(visibleModulesByStore).reduce((count, storeAssignments) => (
        count + storeAssignments.filter(
          (assignment) => assignment.actif && assignment.module?.status === 'active',
        ).length
      ), 0),
    [visibleModulesByStore],
  );

  const usersByRole = useMemo(() => {
    const roleCounts = users.reduce<Record<string, number>>((acc, user) => {
      const key = user.role || 'CLIENT';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const storeModuleCounts = useMemo(
      () =>
        stores.map((store) => ({
          name: store.name || `Store ${store.id}`,
          modules: (() => {
            const storeId = getStoreId(store);
            const publicStore = (publicMarketplace?.stores || []).find(
              (entry) => (entry.storeId ?? entry.id) === storeId,
            );

            if (publicStore) {
              return (publicStore.modules || []).filter(
                (module) => module.enabled !== false && module.visible !== false,
              ).length;
            }

            return (visibleModulesByStore[storeId] || []).filter(
              (assignment) => assignment.actif && assignment.module?.status === 'active',
            ).length;
          })(),
          visible: store.visible !== false,
        })),
    [stores, visibleModulesByStore],
  );

  const topModules = useMemo(() => {
    const moduleUsage = new Map<number, { id: number; name: string; usage: number }>();

    Object.values(visibleModulesByStore).forEach((storeAssignments) => {
      storeAssignments.forEach((assignment) => {
        if (!assignment.actif || assignment.module?.status !== 'active') {
          return;
        }

        const moduleId = assignment.module?.id;
        if (moduleId == null) return;

        const current = moduleUsage.get(moduleId) || {
          id: moduleId,
          name: assignment.module.label || assignment.module.name || `Module ${moduleId}`,
          usage: 0,
        };
        current.usage += 1;
        moduleUsage.set(moduleId, current);
      });
    });

    return Array.from(moduleUsage.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 4);
  }, [visibleModulesByStore]);

  const stats = [
    { label: 'Total utilisateurs', value: users.length, change: `${users.filter((user) => user.role === 'ADMIN_BANK').length} admins`, icon: <Users className="w-5 h-5" /> },
    { label: 'Stores assignes', value: stores.length, change: `${activeStores.length} actifs`, icon: <Store className="w-5 h-5" /> },
    { label: 'Modules assignes', value: visibleModuleCount, change: `${activeModuleCount} actifs`, icon: <Box className="w-5 h-5" /> },
    { label: 'Mes demandes', value: requestCount, change: `${requestCount} demandes envoyées`, icon: <FileText className="w-5 h-5" /> },
  ];

  if (isLoading) {
    return (
      <div className="bank-dashboard-container">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement du back office...
        </div>
      </div>
    );
  }

  return (
    <div className="bank-dashboard-container">
      <div className="bank-dashboard-header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="bank-dashboard-title">Tableau de bord</h1>
          <p className="bank-dashboard-subtitle">
            {marketplace?.bankName ? `Apercu de ${marketplace.bankName}` : 'Apercu de votre marketplace'}
          </p>
        </div>
        <Badge variant="primary">{marketplace?.bankSlug || 'tenant'}</Badge>
      </div>

      {error && <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="bank-stats-grid">
        {stats.map((stat, index) => (
          <KpiCard
            key={index}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={index === 0 ? 'primary' : index === 1 ? 'warning' : index === 2 ? 'success' : 'danger'}
            badge={stat.change}
          />
        ))}
      </div>

      <div className="bank-charts-grid">
        <Card>
          <CardHeader>
            <CardTitle>Repartition des roles</CardTitle>
            <CardDescription>Utilisateurs filtres par marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usersByRole}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stores et modules</CardTitle>
            <CardDescription>Le contenu affiché correspond uniquement a cette marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeModuleCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="modules" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Stores assignes</CardTitle>
            <CardDescription>Chaque store affiche ses propres modules assignes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stores.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun store assigne.</div>
            ) : (
              stores.map((store) => {
                const storeId = getStoreId(store);
                const publicStore = (publicMarketplace?.stores || []).find(
                  (entry) => (entry.storeId ?? entry.id) === storeId,
                );
                const modulesCount = publicStore
                  ? (publicStore.modules || []).filter(
                      (module) => module.enabled !== false && module.visible !== false,
                    ).length
                  : (visibleModulesByStore[storeId] || []).filter(
                      (assignment) => assignment.actif && assignment.module?.status === 'active',
                    ).length;

                return (
                  <div key={store.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{store.name || `Store ${store.id}`}</div>
                        <div className="text-sm text-muted-foreground">{store.description || 'Store marketplace'}</div>
                      </div>
                      <Badge variant={store.visible === false ? 'warning' : 'success'}>
                        {store.visible === false ? 'Masque' : 'Visible'}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(modulesCount * 20, 100)}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{modulesCount} modules assignes</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules les plus presents</CardTitle>
            <CardDescription>Consolidation a travers les stores du tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bank-modules-list">
              {topModules.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun module assigne.</div>
              ) : (
                topModules.map((module, index) => (
                  <div key={module.id} className="bank-module-item">
                    <div className="bank-module-info">
                      <div className="bank-module-header">
                        <span className="bank-module-name">{module.name}</span>
                        <span className="bank-module-usage">{module.usage.toLocaleString()} store(s)</span>
                      </div>
                      <div className="bank-module-progress-bar">
                        <div
                          className="bank-module-progress"
                          style={{
                            width: `${Math.max(30, 100 - index * 15)}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <TrendingUp className="bank-module-trend text-success" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Raccourcis dynamiques selon la configuration de la marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bank-actions-grid">
            <button className="bank-action-card" type="button" onClick={() => navigate('/bank/utilisateurs')}>
              <div className="bank-action-title">Gerer les utilisateurs</div>
              <div className="bank-action-desc">Voir uniquement les comptes de cette marketplace</div>
            </button>
            <button className="bank-action-card" type="button" onClick={() => navigate('/bank/stores')}>
              <div className="bank-action-title">Explorer les stores</div>
              <div className="bank-action-desc">{stores.length} store(s) assigne(s)</div>
            </button>
            <button className="bank-action-card" type="button" onClick={() => navigate('/bank/branding')}>
              <div className="bank-action-title">Personnaliser le branding</div>
              <div className="bank-action-desc">Logo, banniere, couleurs et messages</div>
            </button>
            <button className="bank-action-card" type="button" onClick={() => navigate('/bank/modules')}>
              <div className="bank-action-title">Voir les modules</div>
              <div className="bank-action-desc">{visibleModuleCount} module(s) assigné(s) à cette marketplace</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
