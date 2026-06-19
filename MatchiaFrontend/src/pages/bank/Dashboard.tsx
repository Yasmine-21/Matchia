import '../../styles/BankDashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Store, Box, TrendingUp, Loader2, Users, FileText } from 'lucide-react';
import { AreaChart, Area, Cell, Pie, PieChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { requestService } from '../../services/requestService';
import type { MarketplacePublicDto, ModuleAssignment } from '../../types/apiTypes';
import { KpiCard } from '../../components/ui/KpiCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444'];
const STORE_CHART_COLOR = '#f97316';

const getStoreId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;

export function BankDashboard() {
  const { users, stores, modulesByStore, marketplace, isLoading, error } = useBankTenant();
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
          response.data.filter((request) =>
            request.requestType === 'store'
            || request.requestType === 'module'
            || request.requestType === 'subscription',
          ).length,
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
    return Object.entries(roleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [users]);

  const roleChartData = useMemo(
    () =>
      usersByRole.map((entry, index) => ({
        ...entry,
        percent: users.length > 0 ? Math.round((entry.value / users.length) * 100) : 0,
        fill: COLORS[index % COLORS.length],
      })),
    [users.length, usersByRole],
  );

  const roleChartConfig = useMemo(
    () =>
      roleChartData.reduce<Record<string, { label: string; color: string }>>((acc, entry) => {
        acc[entry.name] = {
          label: entry.name,
          color: entry.fill,
        };
        return acc;
      }, {}),
    [roleChartData],
  );
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
  const storeChartData = useMemo(
    () =>
      [...storeModuleCounts]
        .sort((left, right) => right.modules - left.modules)
        .map((entry) => ({
          ...entry,
          shortName: entry.name.length > 14 ? `${entry.name.slice(0, 13)}...` : entry.name,
        })),
    [storeModuleCounts],
  );

  const busiestStore = storeChartData[0] || null;
  const averageModules = storeChartData.length
    ? Math.round(storeChartData.reduce((sum, entry) => sum + entry.modules, 0) / storeChartData.length)
    : 0;
  const activeStoreRatio = stores.length ? Math.round((activeStores.length / stores.length) * 100) : 0;

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

  const roleTop = roleChartData[0] || null;

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
        <Card className="bank-chart-card bank-chart-card--roles">
          <CardHeader className="bank-chart-header">
            <div>
              <CardTitle>Repartition des roles</CardTitle>
              <CardDescription>Vue circulaire des profils actifs</CardDescription>
            </div>
            <div className="bank-chart-badges">
              <span className="bank-chart-badge">{users.length} users</span>
              <span className="bank-chart-badge">{roleTop ? `${roleTop.name} dominant` : 'Aucun role'}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bank-chart-roles-layout">
              <div className="bank-chart-donut-shell">
                <div className="bank-chart-donut-center">
                  <div className="bank-chart-donut-value">{users.length}</div>
                  <div className="bank-chart-donut-label">users</div>
                </div>
                <ChartContainer config={roleChartConfig} className="bank-chart-container">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                    <Pie
                      data={roleChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={110}
                      paddingAngle={4}
                      strokeWidth={4}
                    >
                      {roleChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="bank-chart-roles-list">
                {roleChartData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune donnee disponible.</div>
                ) : (
                  roleChartData.map((entry) => (
                    <div key={entry.name} className="bank-chart-role-row">
                      <div className="bank-chart-role-top">
                        <div className="bank-chart-role-name-wrap">
                          <span className="bank-chart-role-dot" style={{ backgroundColor: entry.fill }} />
                          <span className="bank-chart-role-name">{entry.name}</span>
                        </div>
                        <span className="bank-chart-role-value">
                          {entry.value} ({entry.percent}%)
                        </span>
                      </div>
                      <div className="bank-chart-role-bar">
                        <div
                          className="bank-chart-role-bar-fill"
                          style={{
                            width: `${Math.max(entry.percent, 8)}%`,
                            backgroundColor: entry.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bank-chart-card bank-chart-card--stores">
          <CardHeader className="bank-chart-header">
            <div>
              <CardTitle>Modules par store</CardTitle>
              <CardDescription>Comparaison visuelle des stores visibles</CardDescription>
            </div>
            <div className="bank-chart-badges">
              <span className="bank-chart-badge">{activeStores.length} actifs</span>
              <span className="bank-chart-badge">{activeStoreRatio}% couverture</span>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                modules: {
                  label: 'Modules visibles',
                  color: STORE_CHART_COLOR,
                },
              }}
              className="bank-chart-area-shell"
            >
              <AreaChart data={storeChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="storeModuleFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STORE_CHART_COLOR} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={STORE_CHART_COLOR} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortName"
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748b"
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748b"
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  type="monotone"
                  dataKey="modules"
                  stroke={STORE_CHART_COLOR}
                  fill="url(#storeModuleFill)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ChartContainer>

            <div className="bank-chart-mini-metrics">
              <div className="bank-chart-mini-metric">
                <div className="bank-chart-mini-label">Store le plus charge</div>
                <div className="bank-chart-mini-value">{busiestStore?.name || 'N/A'}</div>
                <div className="bank-chart-mini-hint">{busiestStore?.modules || 0} modules</div>
              </div>
              <div className="bank-chart-mini-metric">
                <div className="bank-chart-mini-label">Moyenne par store</div>
                <div className="bank-chart-mini-value">{averageModules}</div>
                <div className="bank-chart-mini-hint">modules visibles</div>
              </div>
            </div>
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

    </div>
  );
}





