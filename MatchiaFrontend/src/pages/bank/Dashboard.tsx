import '../../styles/BankDashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Store, Box, TrendingUp, Loader2, Users, FileText, Clock3, ArrowRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { useBankTenant } from '../../hooks/useBankTenant';
import { bankTenantService } from '../../services/bankTenantService';
import { requestService } from '../../services/requestService';
import { financingRequestService, type FinancingSummary } from '../../services/financingRequestService';
import type { MarketplacePublicDto, ModuleAssignment } from '../../types/apiTypes';
import { KpiCard } from '../../components/ui/KpiCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444'];
const STORE_BAR_COLORS = ['#f26a2d', '#2f80d9', '#98dcc4', '#9564e8', '#f5ab3a'];

const getStoreId = (store: { storeId?: number | null; id: number }) => store.storeId ?? store.id;

export function BankDashboard() {
  const { users, stores, modulesByStore, marketplace, isLoading, error } = useBankTenant();
  const [publicMarketplace, setPublicMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [pendingFinancingRequests, setPendingFinancingRequests] = useState<FinancingSummary[]>([]);

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

  useEffect(() => {
    const storeIds = activeStores.map(getStoreId);

    if (storeIds.length === 0) {
      setPendingFinancingRequests([]);
      return;
    }

    let mounted = true;

    const loadPendingFinancingRequests = async () => {
      try {
        const responses = await Promise.all(
          storeIds.map((storeId) => financingRequestService.bankRequests(storeId, 'PENDING')),
        );
        if (!mounted) return;

        const requestsById = new Map<number, FinancingSummary>();
        responses.flatMap((response) => response.data).forEach((request) => {
          requestsById.set(request.id, request);
        });
        setPendingFinancingRequests(
          Array.from(requestsById.values()).sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          ),
        );
      } catch (loadError) {
        console.error('Failed to load pending financing requests for dashboard:', loadError);
        if (mounted) setPendingFinancingRequests([]);
      }
    };

    void loadPendingFinancingRequests();

    return () => {
      mounted = false;
    };
  }, [activeStores]);

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
        .filter((entry) => entry.visible)
        .sort((left, right) => right.modules - left.modules)
        .map((entry, index) => ({
          ...entry,
          shortName: entry.name.length > 14 ? `${entry.name.slice(0, 13)}...` : entry.name,
          color: STORE_BAR_COLORS[index % STORE_BAR_COLORS.length],
        })),
    [storeModuleCounts],
  );

  const topModules = useMemo(() => {
    const moduleUsage = new Map<number, { id: number; name: string; usage: number }>();

    stores.forEach((store) => {
      (store.modules || []).forEach((module) => {
        const moduleId = module.moduleId ?? module.id;
        if (moduleId == null) return;

        const current = moduleUsage.get(moduleId) || {
          id: moduleId,
          name: module.name || `Module ${moduleId}`,
          usage: 0,
        };
        current.usage += 1;
        moduleUsage.set(moduleId, current);
      });
    });

    return Array.from(moduleUsage.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 4);
  }, [stores]);

  const stats = [
    { label: 'Total utilisateurs', value: users.length, change: `${users.filter((user) => user.role === 'ADMIN_BANK').length} admins`, icon: <Users className="w-5 h-5" /> },
    { label: 'Stores assignes', value: stores.length, change: `${activeStores.length} actifs`, icon: <Store className="w-5 h-5" /> },
    { label: 'Modules assignes', value: visibleModuleCount, change: `${activeModuleCount} actifs`, icon: <Box className="w-5 h-5" /> },
    { label: 'Mes demandes', value: requestCount, change: `${requestCount} demandes envoyées`, icon: <FileText className="w-5 h-5" /> },
  ];

  const roleTop = roleChartData[0] || null;
  const displayedPendingFinancingRequests = pendingFinancingRequests.slice(0, 4);

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
              <CardDescription>Nombre de modules</CardDescription>
            </div>
            <div className="bank-chart-badges">
              <span className="bank-chart-badge">{activeStores.length} actifs</span>
            </div>
          </CardHeader>
          <CardContent>
            {storeChartData.length === 0 ? (
              <div className="py-10 text-sm text-muted-foreground">Aucun store visible.</div>
            ) : (
              <ChartContainer
                config={{ modules: { label: 'Modules' } }}
                className="bank-chart-area-shell"
              >
                <BarChart data={storeChartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="shortName" tickLine={false} axisLine={{ stroke: '#d1d5db' }} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="modules" radius={[4, 4, 0, 0]} maxBarSize={42}>
                    {storeChartData.map((store) => <Cell key={store.name} fill={store.color} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
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

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Demandes de financement en attente</CardTitle>
              <CardDescription>Dossiers clients à traiter en priorité</CardDescription>
            </div>
            <Badge variant="warning">{pendingFinancingRequests.length} en attente</Badge>
          </CardHeader>
          <CardContent>
            {displayedPendingFinancingRequests.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Clock3 className="h-6 w-6 text-warning" />
                Aucune demande de financement en attente.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedPendingFinancingRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/bank/financing-requests/${request.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-foreground">{request.clientName}</span>
                        <span className="shrink-0 text-sm font-semibold text-foreground">
                          {new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(request.requestedAmount || 0)} DT
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {request.reference} · {request.productName} · {request.storeName}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
                <Link
                  to="/bank/financing-requests"
                  className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-primary hover:underline"
                >
                  Voir toutes les demandes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}





