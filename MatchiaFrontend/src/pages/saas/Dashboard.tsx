import '../../styles/SaaSDashboard.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Building2, Users, Store, Box, TrendingUp, ArrowUp, ArrowDown, FileText, Loader2, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { banks, stores, modules, requests } from '../../data/mockData';
import { bankService } from '../../services/bankService';
import { Bank } from '../../types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function SaaSDashboard() {
  const [realBanks, setRealBanks] = useState<Bank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const { logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchRealBanks = async () => {
      try {
        const data = await bankService.getAllBanks();
        setRealBanks(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des banques réelles:", error);
      } finally {
        setIsLoadingBanks(false);
      }
    };
    fetchRealBanks();
  }, []);

  const stats = [
    {
      label: 'Banques actives',
      value: banks.filter(b => b.status === 'active').length,
      total: banks.length,
      icon: <Building2 className="w-5 h-5" />,
      change: '+12%',
      trend: 'up'
    },
    {
      label: 'Demandes en attente',
      value: requests.filter(r => r.status === 'pending').length,
      icon: <FileText className="w-5 h-5" />,
      change: '+3',
      trend: 'up'
    },
    {
      label: 'Utilisateurs total',
      value: banks.reduce((sum, b) => sum + b.total_users, 0),
      icon: <Users className="w-5 h-5" />,
      change: '+8.5%',
      trend: 'up'
    },
    {
      label: 'Stores actifs',
      value: stores.filter(s => s.status === 'active').length,
      icon: <Store className="w-5 h-5" />,
      change: '0',
      trend: 'neutral'
    }
  ];

  const monthlyData = [
    { month: 'Jan', banks: 15, users: 45000 },
    { month: 'Fév', banks: 18, users: 52000 },
    { month: 'Mar', banks: 22, users: 61000 },
    { month: 'Avr', banks: 28, users: 75000 }
  ];

  const storeUsage = stores.map(s => ({ name: s.label, usage: s.usage_count }));

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
              {isLoadingBanks ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : (
                // On affiche les 5 dernières banques de la liste réelle
                realBanks.slice(-5).reverse().map((bank) => (
                  <div key={bank.id} className="saas-bank-item">
                    <img src={bank.logoUrl || '/logos/default.png'} alt="" className="saas-bank-logo object-contain" />
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
              {requests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="saas-request-item">
                  <div className="saas-request-header">
                    <div className="saas-bank-name">
                      {request.request_type === 'join' ? 'Demande d\'adhésion' :
                        request.request_type === 'store' ? 'Demande de store' :
                          'Demande de module'}
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <p className="saas-request-notes">{request.notes}</p>
                  <div className="saas-request-date">
                    Créée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
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
