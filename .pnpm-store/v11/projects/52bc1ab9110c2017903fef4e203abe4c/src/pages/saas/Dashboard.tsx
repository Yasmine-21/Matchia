import '../../styles/SaaSDashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import { AlertTriangle, Building2, CalendarDays, FileText, Loader2, LogOut, Store, Users } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { bankService } from '../../services/bankService';
import { requestService } from '../../services/requestService';
import { storeService } from '../../services/storeService';
import { paymentService } from '../../services/paymentService';
import { Bank } from '../../types';
import { MonthlyRevenueDto, RequestDto, StoreDto, StoreMarketplaceCountDto, SubscriptionExpiryAlertDto } from '../../types/apiTypes';

const getRequestTypeLabel = (requestType: RequestDto['requestType']) => {
  switch (requestType) {
    case 'join':
      return "Demande d'adhésion";
    case 'store':
      return 'Demande de store';
    case 'module':
      return 'Demande de module';
    case 'subscription':
      return "Demande de renouvellement";
    default:
      return 'Demande';
  }
};

export function SaaSDashboard() {
  const [realBanks, setRealBanks] = useState<Bank[]>([]);
  const [realStores, setRealStores] = useState<StoreDto[]>([]);
  const [marketplacesPerStore, setMarketplacesPerStore] = useState<StoreMarketplaceCountDto[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueDto[]>([]);
  const [subscriptionAlerts, setSubscriptionAlerts] = useState<SubscriptionExpiryAlertDto[]>([]);
  const [realRequests, setRealRequests] = useState<RequestDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/connexion');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [banksData, storesResponse, requestsResponse, marketplaceCountsResponse, monthlyRevenueResponse, subscriptionAlertsResponse] = await Promise.all([
          bankService.getAllBanks(),
          storeService.getAllStores(),
          requestService.getRequests(),
          storeService.getMarketplaceCounts(),
          paymentService.getMonthlyRevenue(),
          paymentService.getExpiringSubscriptions(),
        ]);

        setRealBanks(banksData);
        setRealStores(storesResponse.data);
        setRealRequests(requestsResponse.data);
        setMarketplacesPerStore(marketplaceCountsResponse.data);
        setMonthlyRevenue(monthlyRevenueResponse.data);
        setSubscriptionAlerts(subscriptionAlertsResponse.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données du dashboard:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, []);

  const activeBanksCount = useMemo(
    () => realBanks.filter((bank) => bank.status === 'active').length,
    [realBanks],
  );
  const pendingRequestsCount = useMemo(
    () => realRequests.filter((request) => request.status === 'pending').length,
    [realRequests],
  );
  const totalUsersCount = useMemo(
    () => realBanks.reduce((sum, bank) => sum + (bank.totalUsers ?? 0), 0),
    [realBanks],
  );
  const activeStoresCount = useMemo(
    () => realStores.filter((store) => store.status === 'active').length,
    [realStores],
  );

  const stats = [
    {
      label: 'Banques actives',
      value: activeBanksCount,
      icon: <Building2 className="w-5 h-5" />,
      badge: isLoadingData ? '...' : `${activeBanksCount} banques`,
      tone: 'success' as const,
    },
    {
      label: 'Demandes en attente',
      value: pendingRequestsCount,
      icon: <FileText className="w-5 h-5" />,
      badge: isLoadingData ? '...' : `${pendingRequestsCount} demandes`,
      tone: 'warning' as const,
    },
    {
      label: 'Utilisateurs totaux',
      value: totalUsersCount,
      icon: <Users className="w-5 h-5" />,
      badge: isLoadingData ? '...' : `${totalUsersCount} users`,
      tone: 'primary' as const,
    },
    {
      label: 'Stores actifs',
      value: activeStoresCount,
      icon: <Store className="w-5 h-5" />,
      badge: isLoadingData ? '...' : `${activeStoresCount} stores`,
      tone: 'secondary' as const,
    },
  ];

  const monthlyRevenueData = monthlyRevenue.map((item) => {
    const [year, month] = item.month.split('-').map(Number);
    return {
      month: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      revenue: item.revenue,
    };
  });

  const formatTnd = (amount: number) => `${amount.toLocaleString('fr-TN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TND`;

  const marketplaceCountsByStore = marketplacesPerStore.map((store) => ({
    name: store.storeName,
    marketplaces: store.marketplaceCount,
  }));

  const pendingRequests = realRequests
    .filter((request) => request.status === 'pending')
    .sort((firstRequest, secondRequest) => (
      new Date(secondRequest.createdAt || 0).getTime() - new Date(firstRequest.createdAt || 0).getTime()
    ))
    .slice(0, 5);

  return (
    <div className="saas-dashboard-container">
      <div className="saas-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="saas-dashboard-title">Tableau de bord </h1>

        </div>
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        {stats.map((stat, index) => (
          <KpiCard
            key={index}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            badge={stat.badge}
          />
        ))}
      </div>

      <div className="saas-charts-grid">
        <Card>
          <CardHeader>
            <CardTitle>Revenu mensuel</CardTitle>
            <CardDescription>Revenu total mensuel en TND</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b"  />
                <YAxis
                  stroke="#64748b"

                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip formatter={(value) => [formatTnd(Number(value ?? 0)), 'Revenu total']} />
                <Line type="monotone" dataKey="revenue" name="Revenu total" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketplaces par store</CardTitle>
            <CardDescription>Nombre de marketplaces utilisant chaque store</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketplaceCountsByStore}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="marketplaces" name="Marketplaces" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="saas-lists-grid">
        <Card>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>

          </CardHeader>
          <CardContent>
            <div className="saas-list-container">
              {isLoadingData ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : subscriptionAlerts.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Aucun abonnement n’expire prochainement.
                </p>
              ) : (
                subscriptionAlerts.map((alert) => {
                  const isUrgent = alert.alertLevel === 'Urgent';
                  const expirationDate = new Date(`${alert.expirationDate}T00:00:00`).toLocaleDateString('fr-FR');

                  return (
                    <div
                      key={alert.subscriptionId}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${isUrgent ? 'border-red-200 bg-red-50/60' : 'border-orange-200 bg-orange-50/60'}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900">Banque « {alert.bankName} »</p>
                          <Badge variant={isUrgent ? 'danger' : 'warning'}>{alert.alertLevel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          L’abonnement de la marketplace « {alert.marketplaceSlug || alert.bankName} » expire le {expirationDate}, soit dans {alert.daysRemaining} {alert.daysRemaining > 1 ? 'jours' : 'jour'}.
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Expiration : {expirationDate}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes en attente</CardTitle>

          </CardHeader>
          <CardContent>
            <div className="saas-list-container">
              {pendingRequests.map((request) => (
                <div key={request.id} className="saas-request-item">
                  <div className="saas-request-header">
                    <div className="saas-bank-name">
                      {getRequestTypeLabel(request.requestType)}
                      <span className="ml-1 text-slate-500">- {request.bankName}</span>
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="saas-request-date">
                    Créée le {new Date(request.createdAt || '').toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
