import '../../styles/BankDashboard.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Users, Store, Box, Eye, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../../components/ui/Badge';

export function BankDashboard() {
  const stats = [
    { label: 'Utilisateurs actifs', value: '12,458', change: '+12.5%', icon: <Users className="w-5 h-5" /> },
    { label: 'Stores activés', value: '3', change: '0', icon: <Store className="w-5 h-5" /> },
    { label: 'Modules activés', value: '8', change: '+2', icon: <Box className="w-5 h-5" /> },
    { label: 'Vues ce mois', value: '45,230', change: '+18.2%', icon: <Eye className="w-5 h-5" /> },
  ];

  const activityData = [
    { day: 'Lun', visits: 1200, conversions: 45 },
    { day: 'Mar', visits: 1800, conversions: 67 },
    { day: 'Mer', visits: 1600, conversions: 52 },
    { day: 'Jeu', visits: 2200, conversions: 78 },
    { day: 'Ven', visits: 2400, conversions: 89 },
    { day: 'Sam', visits: 1900, conversions: 61 },
    { day: 'Dim', visits: 1400, conversions: 38 },
  ];

  const topModules = [
    { name: 'Simulateur', usage: 3245, trend: 'up' },
    { name: 'Comparateur', usage: 2876, trend: 'up' },
    { name: 'Matchia Bot', usage: 2103, trend: 'up' },
    { name: 'Blog', usage: 1547, trend: 'down' },
  ];

  return (
    <div className="bank-dashboard-container">
      <div className="bank-dashboard-header">
        <h1 className="bank-dashboard-title">Tableau de bord</h1>
        <p className="bank-dashboard-subtitle">Aperçu de votre marketplace</p>
      </div>

      <div className="bank-stats-grid">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="bank-stat-header">
                <div className="bank-stat-icon-wrapper">
                  {stat.icon}
                </div>
                <Badge variant="success">{stat.change}</Badge>
              </div>
              <CardDescription>{stat.label}</CardDescription>
              <div className="bank-stat-value">{stat.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="bank-charts-grid">
        <Card>
          <CardHeader>
            <CardTitle>Activité de la semaine</CardTitle>
            <CardDescription>Visites et conversions quotidiennes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={2} name="Visites" />
                <Line type="monotone" dataKey="conversions" stroke="#f97316" strokeWidth={2} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules les plus utilisés</CardTitle>
            <CardDescription>Utilisation par module cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bank-modules-list">
              {topModules.map((module, index) => (
                <div key={index} className="bank-module-item">
                  <div className="bank-module-info">
                    <div className="bank-module-header">
                      <span className="bank-module-name">{module.name}</span>
                      <span className="bank-module-usage">{module.usage.toLocaleString()}</span>
                    </div>
                    <div className="bank-module-progress-bar">
                      <div
                        className="bank-module-progress"
                        style={{ width: `${(module.usage / 3245) * 100}%` }}
                      />
                    </div>
                  </div>
                  <TrendingUp className={`bank-module-trend ${module.trend === 'up' ? 'text-success' : 'text-destructive'}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Raccourcis vers les fonctionnalités courantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bank-actions-grid">
            <button className="bank-action-card">
              <div className="bank-action-title">Gérer les utilisateurs</div>
              <div className="bank-module-usage">Ajouter ou modifier des utilisateurs</div>
            </button>
            <button className="bank-action-card">
              <div className="bank-action-title">Personnaliser le branding</div>
              <div className="bank-module-usage">Modifier les couleurs et logos</div>
            </button>
            <button className="bank-action-card">
              <div className="bank-action-title">Demander un store</div>
              <div className="bank-module-usage">Ajouter de nouveaux stores</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
