import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Download, Eye, Loader2, RefreshCw, Search } from 'lucide-react';
import {
  auditService,
  AuditCategory,
  AuditLog,
  AuditLogFilters,
  AuditStats,
  AuditStatus,
  PageResponse,
} from '../../services/auditService';

const categoryLabel: Record<AuditCategory, string> = {
  core: 'Journal core',
  security: 'Securite',
  data_config: 'Donnees & Config',
  billing: 'Facturation',
};

const categoryVariant: Record<AuditCategory, 'primary' | 'warning' | 'secondary' | 'success'> = {
  core: 'primary',
  security: 'warning',
  data_config: 'secondary',
  billing: 'success',
};

const statusVariant: Record<AuditStatus, 'success' | 'danger'> = {
  success: 'success',
  failure: 'danger',
};

const defaultPage: PageResponse<AuditLog> = {
  content: [],
  number: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

const formatDate = (value?: string) => (
  value ? new Date(value).toLocaleString('fr-FR') : '-'
);

const prettyJson = (value?: string | null) => {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

function useAuditLogs(filters: AuditLogFilters) {
  const [page, setPage] = useState<PageResponse<AuditLog>>(defaultPage);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        auditService.getLogs(filters),
        auditService.getStats(),
      ]);
      if (signal?.aborted) return;
      setPage(logsResponse);
      setStats(statsResponse);
    } catch (loadError) {
      if (signal?.aborted) return;
      console.error('Failed to load audit logs:', loadError);
      setError("Impossible de charger le journal d'audit.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { page, stats, isLoading, error, reload: load };
}

export function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo<AuditLogFilters>(() => ({
    page: Number(searchParams.get('page') || 0),
    limit: Number(searchParams.get('limit') || 20),
    category: (searchParams.get('category') || '') as AuditCategory | '',
    status: (searchParams.get('status') || '') as AuditStatus | '',
    action: searchParams.get('action') || '',
    search: searchParams.get('search') || '',
    resource_type: searchParams.get('resource_type') || '',
    start_date: searchParams.get('start_date') || '',
    end_date: searchParams.get('end_date') || '',
    sort: searchParams.get('sort') || 'createdAt',
    direction: (searchParams.get('direction') || 'desc') as 'asc' | 'desc',
  }), [searchParams]);

  const { page, stats, isLoading, error, reload } = useAuditLogs(filters);

  const updateFilter = (key: keyof AuditLogFilters, value: string | number) => {
    const next = new URLSearchParams(searchParams);
    if (value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.set('page', '0');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const toggleSort = (field: string) => {
    const currentDirection = filters.sort === field && filters.direction === 'asc' ? 'desc' : 'asc';
    const next = new URLSearchParams(searchParams);
    next.set('sort', field);
    next.set('direction', currentDirection);
    next.set('page', '0');
    setSearchParams(next);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const blob = await auditService.exportLogs(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (exportError) {
      console.error('Failed to export audit logs:', exportError);
      alert("Erreur lors de l'export des logs.");
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0 },
    { label: 'Securite', value: stats?.security ?? 0 },
    { label: 'Donnees & Config', value: stats?.dataConfig ?? 0 },
    { label: 'Echecs', value: stats?.failure ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Journal d'Audit</h1>
          <p className="text-muted-foreground">Suivi des evenements core, securite, configuration et facturation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={() => reload()}>
            Reessayer
          </Button>
          <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={() => handleExport('json')} disabled={isExporting}>
            JSON
          </Button>
          <Button icon={<Download className="w-4 h-4" />} onClick={() => handleExport('csv')} disabled={isExporting}>
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="text-sm font-medium mb-2 block">Recherche</label>
              <Input
                placeholder="Acteur, action, ressource..."
                value={filters.search || ''}
                onChange={(event) => updateFilter('search', event.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categorie</label>
              <select value={filters.category || ''} onChange={(event) => updateFilter('category', event.target.value)} className="w-full px-4 py-2 border border-border rounded-lg bg-background">
                <option value="">Toutes</option>
                <option value="core">Journal core</option>
                <option value="security">Securite</option>
                <option value="data_config">Donnees & Config</option>
                <option value="billing">Facturation</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <select value={filters.status || ''} onChange={(event) => updateFilter('status', event.target.value)} className="w-full px-4 py-2 border border-border rounded-lg bg-background">
                <option value="">Tous</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Input value={filters.action || ''} onChange={(event) => updateFilter('action', event.target.value)} placeholder="user.login" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ressource</label>
              <Input value={filters.resource_type || ''} onChange={(event) => updateFilter('resource_type', event.target.value)} placeholder="user" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Debut</label>
              <Input type="datetime-local" value={filters.start_date || ''} onChange={(event) => updateFilter('start_date', event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fin</label>
              <Input type="datetime-local" value={filters.end_date || ''} onChange={(event) => updateFilter('end_date', event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" onClick={resetFilters}>Reinitialiser</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evenements ({page.totalElements})</CardTitle>
          <CardDescription>Logs en lecture seule, filtres et pagination cote serveur</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : page.content.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun evenement trouve</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('createdAt')}>Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('actorName')}>Acteur</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('action')}>Action</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Categorie</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ressource</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">IP</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {page.content.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{log.actorName || 'system'}</div>
                        <div className="text-xs text-muted-foreground">{log.actorRole || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">{log.action}</td>
                      <td className="py-3 px-4"><Badge variant={categoryVariant[log.category]}>{categoryLabel[log.category]}</Badge></td>
                      <td className="py-3 px-4 text-sm">{log.resourceType || '-'}{log.resourceId ? ` #${log.resourceId}` : ''}</td>
                      <td className="py-3 px-4"><Badge variant={statusVariant[log.status]}>{log.status}</Badge></td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{log.ipAddress || 'N/A'}</td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={(event) => { event.stopPropagation(); setSelectedLog(log); }}>
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page.number + 1} / {Math.max(page.totalPages, 1)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page.number <= 0} onClick={() => updateFilter('page', page.number - 1)}>Precedent</Button>
              <Button variant="outline" disabled={page.number + 1 >= page.totalPages} onClick={() => updateFilter('page', page.number + 1)}>Suivant</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detail de l'evenement" size="xl">
        {selectedLog && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div><span className="text-muted-foreground">Action</span><div className="font-medium">{selectedLog.action}</div></div>
              <div><span className="text-muted-foreground">Acteur</span><div className="font-medium">{selectedLog.actorName}</div></div>
              <div><span className="text-muted-foreground">Date</span><div className="font-medium">{formatDate(selectedLog.createdAt)}</div></div>
              <div><span className="text-muted-foreground">Tenant</span><div className="font-medium">{selectedLog.tenantId || '-'}</div></div>
              <div><span className="text-muted-foreground">Ressource</span><div className="font-medium">{selectedLog.resourceType || '-'} {selectedLog.resourceId || ''}</div></div>
              <div><span className="text-muted-foreground">IP</span><div className="font-medium">{selectedLog.ipAddress || '-'}</div></div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">User agent</div>
              <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">{selectedLog.userAgent || '-'}</pre>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">Diff avant/apres</div>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{prettyJson(selectedLog.diff) || '-'}</pre>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Metadata</div>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{prettyJson(selectedLog.metadata) || '-'}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
