import '../../styles/SaaSDashboard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowDown, ArrowUp, Building2, FileText, Loader2, LogOut, Store, Users } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { bankService } from '../../services/bankService';
import { requestService } from '../../services/requestService';
import { storeService } from '../../services/storeService';
import { Bank } from '../../types';
import { RequestDto, StoreDto } from '../../types/apiTypes';

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

const getRequestTypeLabel = (requestType: RequestDto['requestType']) => {
  switch (requestType) {
    case 'join':
      return "Demande d'adhésion";
    case 'store':
      return 'Demande de store';
    case 'module':
      return 'Demande de module';
    default:
      return 'Demande';
  }
};

export function SaaSDashboard() {
  const [realBanks, setRealBanks] = useState<Bank[]>([]);
  const [realStores, setRealStores] = useState<StoreDto[]>([]);
  const [realRequests, setRealRequests] = useState<RequestDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [banksData, storesResponse, requestsResponse] = await Promise.all([
          bankService.getAllBanks(),
          storeService.getAllStores(),
          requestService.getRequests(),
        ]);

        setRealBanks(banksData);
        setRealStores(storesResponse.data);
        setRealRequests(requestsResponse.data);
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
      change: isLoadingData ? '...' : `${activeBanksCount}`,
      trend: 'up' as const,
    },
    {
      label: 'Demandes en attente',
      value: pendingRequestsCount,
      icon: <FileText className="w-5 h-5" />,
      change: isLoadingData ? '...' : `${pendingRequestsCount}`,
      trend: 'up' as const,
    },
    {
      label: 'Utilisateurs total',
      value: totalUsersCount,
      icon: <Users className="w-5 h-5" />,
      change: isLoadingData ? '...' : `${totalUsersCount}`,
      trend: 'up' as const,
    },
    {
      label: 'Stores actifs',
      value: activeStoresCount,
      icon: <Store className="w-5 h-5" />,
      change: isLoadingData ? '...' : `${activeStoresCount}`,
      trend: 'neutral' as const,
    },
  ];

  const monthlyData = [
    { month: 'Jan', banks: 15, users: 45000 },
    { month: 'Fév', banks: 18, users: 52000 },
    { month: 'Mar', banks: 22, users: 61000 },
    { month: 'Avr', banks: 28, users: 75000 },
  ];

  const storeUsage = realStores.map((store) => ({
    name: store.name,
    usage: store.modulesCount ?? 0,
  }));

  const pendingRequests = realRequests.filter((request) => request.status === 'pending');

  return (
    <div className="saas-dashboard-container">
      <div className="saas-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="saas-dashboard-title">Tableau de bord SaaS</h1>
          <p className="saas-dashboard-subtitle">Vue d'ensemble de la plateforme Matchia</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>

      <div className="saas-stats-grid">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="saas-stat-header">
                <div className="saas-stat-icon-wrapper">
                  {stat.icon}
                </div>
                <div className={`saas-stat-trend ${stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {stat.trend === 'up' && <ArrowUp className="w-4 h-4" />}
                  {stat.trend === 'down' && <ArrowDown className="w-4 h-4" />}
                  <span className="saas-bank-name">{stat.change}</span>
                </div>
              </div>
              <CardDescription>{stat.label}</CardDescription>
              <div className="saas-stat-value">{stat.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="saas-charts-grid">
        <Card>
          <CardHeader>
            <CardTitle>Croissance mensuelle</CardTitle>
            <CardDescription>Banques et utilisateurs par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="banks" stroke="#2563eb" strokeWidth={2} name="Banques" />
                <Line type="monotone" dataKey="users" stroke="#f97316" strokeWidth={2} name="Utilisateurs" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisation des stores</CardTitle>
            <CardDescription>Nombre d'utilisations par store</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="usage" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="saas-lists-grid">
        <Card>
          <CardHeader>
            <CardTitle>Banques récentes</CardTitle>
            <CardDescription>Dernières banques ajoutées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="saas-list-container">
              {isLoadingData ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : (
                realBanks.slice(-5).reverse().map((bank) => (
                  <div key={bank.id} className="saas-bank-item">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {getBackendAssetUrl(bank.logoUrl) ? (
                        <img
                          src={getBackendAssetUrl(bank.logoUrl) || ''}
                          alt={bank.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="saas-bank-info">
                      <div className="saas-bank-name">{bank.name}</div>
                      <div className="saas-bank-country text-xs text-muted-foreground">{bank.country}</div>
                    </div>
                    <Badge variant={bank.status === 'active' ? 'success' : 'warning'}>
                      {bank.status === 'active' ? 'Actif' : 'En attente'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes en attente</CardTitle>
            <CardDescription>Actions requises</CardDescription>
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
