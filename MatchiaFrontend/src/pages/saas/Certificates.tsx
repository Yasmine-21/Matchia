import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  History,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Upload,
  Wifi,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { bankService } from '../../services/bankService';
import { certificateService } from '../../services/certificateService';
import apiClient from '../../api/apiClient';
import type {
  Bank,
  CertificateDto,
  CertificateEnvironment,
  CertificateHistoryDto,
  CertificateRequestPayload,
  CertificateStatus,
  CertificateTargetType,
  CertificateType,
} from '../../types/apiTypes';

interface MarketplaceOption {
  id: number;
  bankId?: number | null;
  bankName?: string | null;
  bankSlug?: string | null;
  status?: string | null;
}

interface CertificateFormState {
  name: string;
  type: CertificateType;
  targetType: CertificateTargetType;
  bankId: string;
  marketplaceId: string;
  relatedService: string;
  environment: CertificateEnvironment;
  serialNumber: string;
  fingerprint: string;
  issuer: string;
  issueDate: string;
  expirationDate: string;
  automaticRotationEnabled: boolean;
}

interface FeedbackState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const CERTIFICATE_TYPE_OPTIONS: Array<{ value: CertificateType; label: string }> = [
  { value: 'TLS_SERVER', label: 'TLS Server' },
  { value: 'MTLS_CLIENT', label: 'mTLS Client' },
  { value: 'API_AUTHENTICATION', label: 'API Authentication' },
  { value: 'PAYMENT_INTEGRATION', label: 'Payment Integration' },
  { value: 'DATA_SIGNING', label: 'Data Signing' },
];

const CERTIFICATE_ENV_OPTIONS: Array<{ value: CertificateEnvironment; label: string }> = [
  { value: 'TEST', label: 'Test' },
  { value: 'PRODUCTION', label: 'Production' },
];

const CERTIFICATE_TARGET_OPTIONS: Array<{ value: CertificateTargetType; label: string }> = [
  { value: 'BANK', label: 'Bank' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
];

const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  REQUESTED: 'Requested',
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring soon',
  ROTATING: 'Rotating',
  ROTATED: 'Rotated',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
  FAILED: 'Failed',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR').format(value);
};

const targetLabel = (certificate: CertificateDto) =>
  certificate.bankName || certificate.marketplaceName || 'N/A';

const targetTypeLabel = (certificate: CertificateDto) =>
  certificate.bankId ? 'Banque' : certificate.marketplaceId ? 'Marketplace' : 'N/A';

const statusVariant = (status: CertificateStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'REQUESTED':
    case 'EXPIRING_SOON':
      return 'warning';
    case 'ROTATED':
      return 'primary';
    case 'ROTATING':
      return 'secondary';
    case 'EXPIRED':
    case 'REVOKED':
    case 'FAILED':
      return 'danger';
    default:
      return 'default';
  }
};

const environmentVariant = (environment: CertificateEnvironment) =>
  environment === 'PRODUCTION' ? 'warning' : 'secondary';

const canActivate = (status: CertificateStatus) => ['REQUESTED', 'ROTATED', 'EXPIRING_SOON', 'FAILED'].includes(status);

const canManage = (status: CertificateStatus) => !['REVOKED', 'EXPIRED'].includes(status);

const initialFormState = (banks: Bank[], marketplaces: MarketplaceOption[]): CertificateFormState => ({
  name: '',
  type: 'TLS_SERVER',
  targetType: marketsOrBankDefault(marketplaces, banks),
  bankId: banks[0]?.id ? String(banks[0].id) : '',
  marketplaceId: marketplaces[0]?.id ? String(marketplaces[0].id) : '',
  relatedService: '',
  environment: 'TEST',
  serialNumber: '',
  fingerprint: '',
  issuer: '',
  issueDate: new Date().toISOString().slice(0, 10),
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  automaticRotationEnabled: true,
});

function marketsOrBankDefault(marketplaces: MarketplaceOption[], banks: Bank[]): CertificateTargetType {
  if (banks.length > 0) return 'BANK';
  if (marketplaces.length > 0) return 'MARKETPLACE';
  return 'BANK';
}

export function Certificates() {
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CertificateStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CertificateType>('ALL');
  const [environmentFilter, setEnvironmentFilter] = useState<'ALL' | CertificateEnvironment>('ALL');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateDto | null>(null);
  const [history, setHistory] = useState<CertificateHistoryDto[]>([]);
  const [historyCertificate, setHistoryCertificate] = useState<CertificateDto | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formMode, setFormMode] = useState<'issue' | 'import' | null>(null);
  const [formState, setFormState] = useState<CertificateFormState>(initialFormState([], []));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CertificateDto | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true);
        const [banksData, marketplacesResponse] = await Promise.all([
          bankService.getAllBanks(),
          apiClient.get<MarketplaceOption[]>('/api/admin/marketplaces'),
        ]);
        setBanks(banksData);
        setMarketplaces(marketplacesResponse.data || []);
        setFormState(initialFormState(banksData, marketplacesResponse.data || []));
      } catch (metadataError) {
        console.error('Failed to load certificate metadata:', metadataError);
        setError("Impossible de charger les banques et marketplaces disponibles.");
      } finally {
        setIsMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await certificateService.getAll();
        setCertificates(response.data || []);
      } catch (loadError) {
        console.error('Failed to load certificates:', loadError);
        setError("Impossible de charger les certificats.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificates();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((certificate) => {
      const text = [
        certificate.name,
        certificate.relatedService,
        certificate.bankName,
        certificate.marketplaceName,
        certificate.serialNumber,
        certificate.fingerprint,
        certificate.issuer,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search.trim() || text.includes(search.toLowerCase().trim());
      const matchesStatus = statusFilter === 'ALL' || certificate.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || certificate.type === typeFilter;
      const matchesEnvironment = environmentFilter === 'ALL' || certificate.environment === environmentFilter;
      return matchesSearch && matchesStatus && matchesType && matchesEnvironment;
    });
  }, [certificates, search, statusFilter, typeFilter, environmentFilter]);

  const stats = useMemo(() => {
    const total = certificates.length;
    const active = certificates.filter((item) => item.status === 'ACTIVE').length;
    const expiringSoon = certificates.filter((item) => item.status === 'EXPIRING_SOON').length;
    const revoked = certificates.filter((item) => item.status === 'REVOKED').length;

    return [
      { label: 'Certificats', value: total, icon: <ShieldPlus className="h-5 w-5" />, variant: 'primary' as const },
      { label: 'Actifs', value: active, icon: <ShieldCheck className="h-5 w-5" />, variant: 'success' as const },
      { label: 'Bientôt expirants', value: expiringSoon, icon: <Clock3 className="h-5 w-5" />, variant: 'warning' as const },
      { label: 'Révoqués', value: revoked, icon: <ShieldAlert className="h-5 w-5" />, variant: 'danger' as const },
    ];
  }, [certificates]);

  const resetForm = (mode: 'issue' | 'import') => {
    const nextForm = initialFormState(banks, marketplaces);
    setFormMode(mode);
    setFormError('');
    setFormState({
      ...nextForm,
      automaticRotationEnabled: mode === 'issue',
    });
  };

  const openView = (certificate: CertificateDto) => {
    setSelectedCertificate(certificate);
  };

  const loadHistory = async (certificate: CertificateDto) => {
    try {
      setHistoryLoading(true);
      setHistoryCertificate(certificate);
      const response = await certificateService.getHistory(certificate.id);
      setHistory(response.data || []);
    } catch (historyError) {
      console.error('Failed to load certificate history:', historyError);
      setFeedback({ type: 'error', message: "Impossible de charger l'historique du certificat." });
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshAfterAction = async (certificateId: number, keepSelection = true) => {
    const [certificateResponse, listResponse] = await Promise.all([
      certificateService.getById(certificateId),
      certificateService.getAll(),
    ]);
    setCertificates(listResponse.data || []);
    if (keepSelection) {
      setSelectedCertificate(certificateResponse.data);
    }
  };

  const performAction = async (action: 'activate' | 'test' | 'rotate', certificate: CertificateDto) => {
    try {
      setActionLoadingId(certificate.id);
      if (action === 'activate') {
        const response = await certificateService.activate(certificate.id);
        setFeedback({ type: 'success', message: `Le certificat ${response.data.name} a été activé.` });
      } else if (action === 'test') {
        const response = await certificateService.test(certificate.id);
        setFeedback({
          type: response.data.passed ? 'success' : 'error',
          message: response.data.message,
        });
      } else if (action === 'rotate') {
        const response = await certificateService.rotate(certificate.id);
        setFeedback({ type: 'success', message: `Le certificat ${response.data.name} a été tourné.` });
      }
      await refreshAfterAction(certificate.id, true);
    } catch (actionError) {
      console.error(`Failed to ${action} certificate:`, actionError);
      setFeedback({ type: 'error', message: "Une erreur est survenue lors de l'action demandée." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRevoke = (certificate: CertificateDto) => {
    setRevokeTarget(certificate);
    setRevokeReason('');
  };

  const submitRevoke = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) {
      setFeedback({ type: 'error', message: 'Veuillez saisir un motif de révocation.' });
      return;
    }

    try {
      setActionLoadingId(revokeTarget.id);
      const response = await certificateService.revoke(revokeTarget.id, { reason: revokeReason.trim() });
      setFeedback({ type: 'success', message: `Le certificat ${response.data.name} a été révoqué.` });
      await refreshAfterAction(revokeTarget.id, true);
      setRevokeTarget(null);
    } catch (revokeError) {
      console.error('Failed to revoke certificate:', revokeError);
      setFeedback({ type: 'error', message: "Impossible de révoquer le certificat." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openIssueModal = () => resetForm('issue');
  const openImportModal = () => resetForm('import');

  const validateForm = () => {
    if (!formState.name.trim()) return 'Le nom du certificat est obligatoire.';
    if (!formState.relatedService.trim()) return 'Le service associé est obligatoire.';
    if (!formState.issuer.trim()) return "L'émetteur est obligatoire.";
    if (!formState.issueDate) return "La date d'émission est obligatoire.";
    if (!formState.expirationDate) return "La date d'expiration est obligatoire.";
    if (formState.expirationDate < formState.issueDate) {
      return "La date d'expiration doit être postérieure à la date d'émission.";
    }
    if (formState.targetType === 'BANK' && !formState.bankId) return 'Sélectionnez une banque.';
    if (formState.targetType === 'MARKETPLACE' && !formState.marketplaceId) return 'Sélectionnez une marketplace.';
    return '';
  };

  const submitForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: CertificateRequestPayload = {
      name: formState.name.trim(),
      type: formState.type,
      targetType: formState.targetType,
      bankId: formState.targetType === 'BANK' ? Number(formState.bankId) : null,
      marketplaceId: formState.targetType === 'MARKETPLACE' ? Number(formState.marketplaceId) : null,
      relatedService: formState.relatedService.trim(),
      environment: formState.environment,
      serialNumber: formState.serialNumber.trim() || null,
      fingerprint: formState.fingerprint.trim() || null,
      issuer: formState.issuer.trim() || null,
      issueDate: formState.issueDate || null,
      expirationDate: formState.expirationDate || null,
      automaticRotationEnabled: formState.automaticRotationEnabled,
    };

    try {
      setSaving(true);
      setFormError('');
      const response = formMode === 'import'
        ? await certificateService.import(payload)
        : await certificateService.issue(payload);

      setCertificates((prev) => [response.data, ...prev.filter((item) => item.id !== response.data.id)]);
      setSelectedCertificate(response.data);
      setFeedback({
        type: 'success',
        message: formMode === 'import'
          ? `Le certificat ${response.data.name} a été importé.`
          : `Le certificat ${response.data.name} a été créé.`,
      });
      setFormMode(null);
    } catch (submitError) {
      console.error('Failed to save certificate:', submitError);
      setFormError("Impossible d'enregistrer le certificat.");
    } finally {
      setSaving(false);
    }
  };

  const selectedTargetSubLabel = formState.targetType === 'BANK'
    ? banks.find((bank) => String(bank.id) === formState.bankId)?.slug
    : marketplaces.find((marketplace) => String(marketplace.id) === formState.marketplaceId)?.bankName;

  const detailTarget = selectedCertificate ? targetLabel(selectedCertificate) : '-';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-r from-slate-50 to-orange-50 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">
            <Wifi className="h-4 w-4" />
            Sécurité et certificats
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des certificats</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Suivez les certificats liés aux banques et marketplaces, et gérez leur cycle de vie
            uniquement lorsque l&apos;integration sécurisée le nécessite.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={openImportModal}
            disabled={isMetadataLoading}
          >
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <Button
            variant="primary"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={openIssueModal}
            disabled={isMetadataLoading}
          >
            <Plus className="h-4 w-4" />
            Émettre
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : stat.value}
                </div>
              </div>
              <div className={`rounded-2xl p-3 ${
                stat.variant === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : stat.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : stat.variant === 'danger'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-blue-50 text-blue-600'
              }`}>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Certificats enregistrés</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Les certificats sont affichés avec leur cible, leur type, leur état et leur durée restante.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un certificat..."
              icon={<Search className="h-4 w-4" />}
            />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CertificateStatus)}
              options={[
                { value: 'ALL', label: 'Tous les statuts' },
                ...Object.entries(CERTIFICATE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | CertificateType)}
              options={[
                { value: 'ALL', label: 'Tous les types' },
                ...CERTIFICATE_TYPE_OPTIONS,
              ]}
            />
            <Select
              value={environmentFilter}
              onChange={(event) => setEnvironmentFilter(event.target.value as 'ALL' | CertificateEnvironment)}
              options={[
                { value: 'ALL', label: 'Tous les environnements' },
                ...CERTIFICATE_ENV_OPTIONS,
              ]}
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des certificats...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <ShieldPlus className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Aucun certificat trouvé</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Ajustez vos filtres ou créez un nouveau certificat pour un service sécurisé.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cible</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Env.</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Restant</TableHead>
                  <TableHead>Rotation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell className="min-w-[190px]">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{targetLabel(certificate)}</div>
                        <div className="text-xs text-slate-500">{targetTypeLabel(certificate)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="max-w-[220px] truncate font-medium text-slate-700">{certificate.relatedService}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{certificate.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={environmentVariant(certificate.environment)}>{certificate.environment}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(certificate.status)}>{CERTIFICATE_STATUS_LABELS[certificate.status]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {formatDate(certificate.expirationDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {certificate.remainingDays === null || certificate.remainingDays === undefined
                            ? '-'
                            : certificate.remainingDays === 0
                              ? 'Aujourd&apos;hui'
                              : `${formatNumber(certificate.remainingDays)} jour${certificate.remainingDays > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={certificate.automaticRotationEnabled ? 'success' : 'secondary'}>
                        {certificate.automaticRotationEnabled ? 'Activée' : 'Désactivée'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(certificate)}
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Plus d&apos;actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => openView(certificate)}>
                              <Eye className="h-4 w-4" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => loadHistory(certificate)}>
                              <History className="h-4 w-4" />
                              Historique
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => performAction('test', certificate)}
                              disabled={actionLoadingId === certificate.id || !canManage(certificate.status)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Tester
                            </DropdownMenuItem>
                            {canActivate(certificate.status) && (
                              <DropdownMenuItem
                                onClick={() => performAction('activate', certificate)}
                                disabled={actionLoadingId === certificate.id}
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Activer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => performAction('rotate', certificate)}
                              disabled={actionLoadingId === certificate.id || !canManage(certificate.status)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Tourner
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openRevoke(certificate)}
                              disabled={!canManage(certificate.status)}
                            >
                              <Ban className="h-4 w-4" />
                              Révoquer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={formMode !== null}
        onClose={() => {
          if (!saving) {
            setFormMode(null);
            setFormError('');
          }
        }}
        title={formMode === 'import' ? 'Importer un certificat' : 'Émettre un certificat'}
        size="xl"
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nom"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Certificat API Banque BTK"
              />
              <Select
                label="Type"
                value={formState.type}
                onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value as CertificateType }))}
                options={CERTIFICATE_TYPE_OPTIONS}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Cible"
                value={formState.targetType}
                onChange={(event) => setFormState((prev) => ({
                  ...prev,
                  targetType: event.target.value as CertificateTargetType,
                }))}
                options={CERTIFICATE_TARGET_OPTIONS}
              />

              {formState.targetType === 'BANK' ? (
                <Select
                  label="Banque"
                  value={formState.bankId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, bankId: event.target.value }))}
                  options={[
                    { value: '', label: banks.length === 0 ? 'Aucune banque' : 'Sélectionner une banque' },
                    ...banks.map((bank) => ({ value: String(bank.id), label: bank.name })),
                  ]}
                />
              ) : (
                <Select
                  label="Marketplace"
                  value={formState.marketplaceId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, marketplaceId: event.target.value }))}
                  options={[
                    { value: '', label: marketplaces.length === 0 ? 'Aucune marketplace' : 'Sélectionner une marketplace' },
                    ...marketplaces.map((marketplace) => ({
                      value: String(marketplace.id),
                      label: marketplace.bankName || marketplace.bankSlug || `Marketplace ${marketplace.id}`,
                    })),
                  ]}
                />
              )}
            </div>

            <Input
              label="Service ou intégration"
              value={formState.relatedService}
              onChange={(event) => setFormState((prev) => ({ ...prev, relatedService: event.target.value }))}
              placeholder="API bancaire, Stripe, HTTPS, signature..."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Environnement"
                value={formState.environment}
                onChange={(event) => setFormState((prev) => ({ ...prev, environment: event.target.value as CertificateEnvironment }))}
                options={CERTIFICATE_ENV_OPTIONS}
              />

              <Input
                label="Émetteur"
                value={formState.issuer}
                onChange={(event) => setFormState((prev) => ({ ...prev, issuer: event.target.value }))}
                placeholder="Matchia Trust Center"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Date d'émission"
                type="date"
                value={formState.issueDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, issueDate: event.target.value }))}
              />
              <Input
                label="Date d'expiration"
                type="date"
                value={formState.expirationDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, expirationDate: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Numéro de série"
                value={formState.serialNumber}
                onChange={(event) => setFormState((prev) => ({ ...prev, serialNumber: event.target.value }))}
                placeholder="Optionnel si généré par le backend"
              />
              <Input
                label="Fingerprint"
                value={formState.fingerprint}
                onChange={(event) => setFormState((prev) => ({ ...prev, fingerprint: event.target.value }))}
                placeholder="Optionnel si généré par le backend"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">Rotation automatique</div>
                <p className="text-sm text-slate-500">Déclenche une rotation avant l&apos;expiration.</p>
              </div>
              <Switch
                checked={formState.automaticRotationEnabled}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, automaticRotationEnabled: checked }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  {formMode === 'import' ? <Upload className="h-5 w-5" /> : <ShieldPlus className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    {formMode === 'import' ? 'Import' : 'Issue'}
                  </div>
                  <div className="text-xl font-bold text-slate-900">{formState.name || 'Aperçu du certificat'}</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Cible</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formState.targetType === 'BANK'
                      ? banks.find((bank) => String(bank.id) === formState.bankId)?.name || 'Sélectionnez une banque'
                      : marketplaces.find((marketplace) => String(marketplace.id) === formState.marketplaceId)?.bankName
                        || marketplaces.find((marketplace) => String(marketplace.id) === formState.marketplaceId)?.bankSlug
                        || 'Sélectionnez une marketplace'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedTargetSubLabel || 'Le certificat sera associé à une cible sécurisée.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Type</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formState.type}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Environnement</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formState.environment}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Service</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formState.relatedService || 'Service non renseigné'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Émission</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formState.issueDate ? formatDate(formState.issueDate) : '-'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Expiration</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formState.expirationDate ? formatDate(formState.expirationDate) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              Un certificat n&apos;est créé que pour une intégration sécurisée réelle : API bancaire, service de paiement, HTTPS de domaine ou signature de données.
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => {
              if (!saving) {
                setFormMode(null);
                setFormError('');
              }
            }}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            className="bg-orange-500 hover:bg-orange-600"
            loading={saving}
            onClick={submitForm}
          >
            {formMode === 'import' ? 'Importer' : 'Émettre'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={selectedCertificate !== null}
        onClose={() => setSelectedCertificate(null)}
        title="Détails du certificat"
        size="xl"
      >
        {selectedCertificate && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Certificat</div>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedCertificate.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedCertificate.relatedService}
                    </p>
                  </div>
                  <Badge variant={statusVariant(selectedCertificate.status)}>
                    {CERTIFICATE_STATUS_LABELS[selectedCertificate.status]}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Cible</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {detailTarget}
                    </div>
                    <div className="text-xs text-slate-500">{targetTypeLabel(selectedCertificate)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Restant</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedCertificate.remainingDays === null || selectedCertificate.remainingDays === undefined
                        ? '-'
                        : `${selectedCertificate.remainingDays} jour${selectedCertificate.remainingDays > 1 ? 's' : ''}`}
                    </div>
                    <div className="text-xs text-slate-500">jusqu&apos;à expiration</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Type</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{selectedCertificate.type}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Environnement</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{selectedCertificate.environment}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Numéro de série</div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {selectedCertificate.serialNumber || '-'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Fingerprint</div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {selectedCertificate.fingerprint || '-'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Émetteur</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{selectedCertificate.issuer || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Rotation automatique</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedCertificate.automaticRotationEnabled ? 'Activée' : 'Désactivée'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Actions disponibles
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {canActivate(selectedCertificate.status) && (
                      <Button
                        variant="outline"
                        disabled={actionLoadingId === selectedCertificate.id}
                        onClick={() => performAction('activate', selectedCertificate)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Activer
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={actionLoadingId === selectedCertificate.id || !canManage(selectedCertificate.status)}
                      onClick={() => performAction('test', selectedCertificate)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Tester
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoadingId === selectedCertificate.id || !canManage(selectedCertificate.status)}
                      onClick={() => performAction('rotate', selectedCertificate)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Tourner
                    </Button>
                    <Button
                      variant="danger"
                      disabled={actionLoadingId === selectedCertificate.id || !canManage(selectedCertificate.status)}
                      onClick={() => openRevoke(selectedCertificate)}
                    >
                      <Ban className="h-4 w-4" />
                      Révoquer
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => loadHistory(selectedCertificate)}
                    >
                      <History className="h-4 w-4" />
                      Historique
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Utilisation recommandée
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Utilisez ce certificat uniquement pour une communication sécurisée réellement requise.
                    Aucun certificat n&apos;est créé automatiquement après un paiement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={historyCertificate !== null}
        onClose={() => setHistoryCertificate(null)}
        title="Historique du certificat"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {historyCertificate?.name || 'Certificat'}
            </div>
            <div className="text-sm text-slate-500">{historyCertificate?.relatedService || ''}</div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement de l&apos;historique...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              Aucun historique disponible pour ce certificat.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{item.action}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.details || '-'}</div>
                    </div>
                    <Badge variant={item.statusAfterAction ? statusVariant(item.statusAfterAction) : 'default'}>
                      {item.statusAfterAction || 'N/A'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Par: {item.performedBy || 'system'}</span>
                    <span>Date: {formatDate(item.performedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Révoquer le certificat"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            Vous êtes sur le point de révoquer le certificat <strong>{revokeTarget?.name}</strong>.
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Motif de révocation</label>
            <Textarea
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              rows={4}
              placeholder="Compromission, intégration supprimée, remplacement..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" disabled={actionLoadingId === revokeTarget?.id} onClick={() => setRevokeTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={actionLoadingId === revokeTarget?.id}
              onClick={submitRevoke}
            >
              Révoquer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
