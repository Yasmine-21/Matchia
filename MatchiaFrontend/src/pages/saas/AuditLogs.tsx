import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Download, Search, Loader2 } from 'lucide-react';
import { auditService, AuditLog } from '../../services/auditService';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Charger les logs au montage du composant
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await auditService.getLogs();
      setLogs(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des logs d\'audit :', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les logs
  const filteredLogs = logs.filter((log) => {
    const userMatch = log.userName.toLowerCase().includes(searchUser.toLowerCase());
    const actionMatch = filterAction === 'ALL' || log.action === filterAction;
    return userMatch && actionMatch;
  });

  // Exporter en CSV
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await auditService.exportLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors de l\'export des logs :', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Déterminer le variant du badge en fonction de l'action
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'primary';
      case 'DELETE':
        return 'danger';
      case 'LOGIN':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Formater la date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Journal d'Audit</h1>
          <p className="text-muted-foreground">Suivi de toutes les actions effectuées sur la plateforme</p>
        </div>
        <Button
          icon={<Download className="w-5 h-5" />}
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exportation...' : 'Exporter CSV'}
        </Button>
      </div>

      {/* Zone de filtres */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rechercher par utilisateur</label>
              <Input
                placeholder="Nom d'utilisateur..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filtrer par type d'action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN')}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">Toutes les actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affichage des logs */}
      <Card>
        <CardHeader>
          <CardTitle>Journal d'audit ({filteredLogs.length})</CardTitle>
          <CardDescription>Résumé complet de toutes les actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun log d'audit trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Utilisateur</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type d'entité</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date et Heure</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Adresse IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {log.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{log.userName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{log.entityType}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {log.ipAddress || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
