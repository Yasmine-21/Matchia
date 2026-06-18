import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Building2,
  CheckCircle,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { bankService, BankFormPayload } from '../../services/bankService';
import { Bank } from '../../types';
import { BankStatus } from '../../types/apiTypes';

type BankFormState = BankFormPayload & {
  establishmentYearInput: string;
};

const emptyBankForm = (): BankFormState => ({
  name: '',
  email: '',
  country: '',
  slug: '',
  websiteUrl: '',
  description: '',
  establishmentYear: null,
  establishmentYearInput: '',
  status: 'inactive',
  logo: null,
});

const getYear = (bank: Bank) => bank.establishmentYear ?? bank.establishedYear ?? null;
const getUsers = (bank: Bank) => bank.totalUsers ?? 0;
const getAssignedStores = (bank: Bank) => bank.assignedStoresCount ?? 0;

const getLogoUrl = (logoUrl?: string | null) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `http://localhost:8081${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
};

const statusLabel: Record<BankStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  pending: 'En attente',
  suspended: 'Suspendu',
  rejected: 'Rejete',
};

const statusVariant = (status: BankStatus) => (
  status === 'active' ? 'success' : status === 'inactive' ? 'secondary' : status === 'suspended' || status === 'rejected' ? 'danger' : 'warning'
);

const StatusSwitch = ({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
      checked
        ? 'border-emerald-500 bg-emerald-500'
        : 'border-gray-300 bg-gray-200'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
);

const BankLogo = ({ bank, size = 'sm' }: { bank: Bank; size?: 'sm' | 'lg' }) => {
  const [hasError, setHasError] = useState(false);
  const logoSrc = !hasError ? getLogoUrl(bank.logoUrl) : null;
  const sizeClass = size === 'lg' ? 'h-20 w-20 rounded-xl' : 'h-10 w-10 rounded-lg';
  const iconClass = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';

  useEffect(() => {
    setHasError(false);
  }, [bank.logoUrl]);

  if (!logoSrc) {
    return (
      <div className={`${sizeClass} flex shrink-0 items-center justify-center border border-gray-200 bg-orange-50 text-orange-500`}>
        <Building2 className={iconClass} />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={bank.name || 'Logo banque'}
      className={`${sizeClass} shrink-0 border border-gray-200 bg-white object-contain p-1`}
      onError={() => setHasError(true)}
    />
  );
};

const toPayload = (form: BankFormState): BankFormPayload => ({
  name: form.name.trim(),
  email: form.email?.trim(),
  country: form.country?.trim(),
  slug: form.slug?.trim(),
  websiteUrl: form.websiteUrl?.trim(),
  description: form.description?.trim(),
  establishmentYear: form.establishmentYearInput ? Number(form.establishmentYearInput) : null,
  status: form.status,
  logo: form.logo,
});

export function SaaSBanks() {
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BankFormState>(emptyBankForm);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<BankFormState>(emptyBankForm);
  const [formError, setFormError] = useState('');
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

  const fetchBanks = async () => {
    try {
      setIsLoading(true);
      const data = await bankService.getAllBanks();
      setBanksList(data);
    } catch (error) {
      console.error('Erreur lors de la recuperation :', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const filteredBanks = useMemo(() => banksList.filter((bank) => (
    (bank.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bank.country || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bank.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )), [banksList, searchTerm]);

  const validateForm = (form: BankFormState) => {
    const currentYear = new Date().getFullYear();
    const year = form.establishmentYearInput ? Number(form.establishmentYearInput) : null;

    if (!form.name.trim()) return 'Le nom de la banque est obligatoire.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "L'email de la banque est invalide.";
    if (year !== null && (Number.isNaN(year) || year < 1800 || year > currentYear)) return `L'annee doit etre entre 1800 et ${currentYear}.`;
    if (form.logo && form.logo.size > 2 * 1024 * 1024) return 'Le logo ne doit pas depasser 2 Mo.';
    return '';
  };

  const handleLogoChange = (
    event: ChangeEvent<HTMLInputElement>,
    setter: Dispatch<SetStateAction<BankFormState>>,
  ) => {
    const file = event.target.files?.[0] || null;
    setter((prev) => ({ ...prev, logo: file }));
  };

  const handleCreateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateForm(newBank);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const createdBank = await bankService.createBank(toPayload(newBank));
      setBanksList((prev) => [...prev, createdBank]);
      setIsAddModalOpen(false);
      setNewBank(emptyBankForm());
      setFormError('');
      alert('Banque ajoutee avec succes.');
    } catch (error) {
      console.error('Erreur creation:', error);
      setFormError("Erreur lors de l'ajout de la banque.");
    }
  };

  const handleEditClick = (bank: Bank) => {
    const year = getYear(bank);
    setEditingBankId(bank.id);
    setEditForm({
      name: bank.name || '',
      email: bank.email || '',
      country: bank.country || '',
      slug: bank.slug || '',
      websiteUrl: bank.websiteUrl || '',
      description: bank.description || '',
      establishmentYear: year,
      establishmentYearInput: year ? String(year) : '',
      status: bank.status || 'inactive',
      logo: null,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingBankId) return;
    const error = validateForm(editForm);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const updated = await bankService.updateBank(editingBankId, toPayload(editForm));
      setBanksList((prev) => prev.map((bank) => bank.id === updated.id ? updated : bank));
      setSelectedBank((prev) => prev?.id === updated.id ? updated : prev);
      setIsEditModalOpen(false);
      setFormError('');
      alert('Banque mise a jour avec succes.');
    } catch (error) {
      console.error('Erreur lors de la mise a jour :', error);
      setFormError('Echec de la mise a jour.');
    }
  };

  const handleStatusToggle = async (bank: Bank) => {
    const nextStatus: BankStatus = bank.status === 'active' ? 'inactive' : 'active';
    const previousBank = bank;
    const optimisticBank = { ...bank, status: nextStatus };

    setBanksList((prev) => prev.map((item) => item.id === bank.id ? optimisticBank : item));
    setSelectedBank((prev) => prev?.id === bank.id ? optimisticBank : prev);

    try {
      setSavingStatusId(bank.id);
      const updated = await bankService.updateBankStatus(bank.id, nextStatus);
      setBanksList((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      setSelectedBank((prev) => prev?.id === updated.id ? updated : prev);
    } catch (error) {
      console.error('Erreur changement statut:', error);
      setBanksList((prev) => prev.map((item) => item.id === previousBank.id ? previousBank : item));
      setSelectedBank((prev) => prev?.id === previousBank.id ? previousBank : prev);
      alert("Impossible de changer le statut de la banque.");
    } finally {
      setSavingStatusId(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Etes-vous sur de vouloir supprimer la banque ${name} ?`)) return;

    try {
      await bankService.deleteBank(id);
      setBanksList((prev) => prev.filter((bank) => bank.id !== id));
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const renderForm = (
    form: BankFormState,
    setForm: Dispatch<SetStateAction<BankFormState>>,
    onSubmit: (event: FormEvent) => void,
    submitLabel: string,
  ) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="Nom de la banque *" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
        <Input label="Email banque" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="contact@banque.tn" />
        <Input label="Pays" value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Tunisie" />
        <Input label="Slug" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="wifak-bank" />
        <Input label="Site web" type="url" value={form.websiteUrl} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))} placeholder="https://www.exemple.com" />
        <Input
          label="Annee d'etablissement"
          type="number"
          min="1800"
          max={new Date().getFullYear()}
          value={form.establishmentYearInput}
          onChange={(e) => setForm((prev) => ({ ...prev, establishmentYearInput: e.target.value }))}
          placeholder="1984"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Logo de la banque</label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4" />
            {form.logo ? form.logo.name : 'PNG, JPG ou SVG (max. 2 Mo)'}
          </span>
          <span className="text-primary">Choisir</span>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" onChange={(e) => handleLogoChange(e, setForm)} />
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          placeholder="Decrivez brievement la banque..."
          className="w-full min-h-[90px] rounded-md border border-input bg-background p-3 text-sm"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Statut</p>
          <p className="text-xs text-muted-foreground">Une nouvelle banque est inactive par defaut.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${form.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`}>
            {form.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
          <StatusSwitch
            checked={form.status === 'active'}
            label="Changer le statut de la banque"
            onChange={() => setForm((prev) => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))}
          />
        </div>
      </div>

      <div className="flex gap-3 border-t pt-4">
        <Button type="submit" className="flex-1">{submitLabel}</Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setFormError('');
          }}
          className="flex-1"
        >
          Annuler
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-9">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Gestion des banques</h1>
          <p className="text-muted-foreground">Gerez toutes les banques sur la plateforme</p>
        </div>
        <Button
          icon={<Plus className="h-5 w-5" />}
          onClick={() => {
            setNewBank(emptyBankForm());
            setFormError('');
            setIsAddModalOpen(true);
          }}
        >
          Ajouter une banque
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Rechercher une banque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-5 w-5" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des banques ({filteredBanks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 text-left">Banque</th>
                  <th className="px-4 py-3 text-left">Pays</th>
                  <th className="px-4 py-3 text-left">Stores assignes</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Creation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBanks.map((bank) => (
                  <tr key={bank.id} className="border-b border-border transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BankLogo bank={bank} />
                        <div>
                          <div className="font-medium">{bank.name}</div>
                          <div className="text-sm text-muted-foreground">{bank.email || bank.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{bank.country || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{getAssignedStores(bank)} stores</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant(bank.status)}>{statusLabel[bank.status] || bank.status}</Badge>
                        <StatusSwitch
                          checked={bank.status === 'active'}
                          disabled={savingStatusId === bank.id}
                          label={bank.status === 'active' ? 'Desactiver la banque' : 'Activer la banque'}
                          onChange={() => handleStatusToggle(bank)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {bank.createdAt ? new Date(bank.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`http://${bank.slug}.lvh.me:5173/bank/dashboard`} className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10" title="Back-office">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button onClick={() => { setSelectedBank(bank); setIsViewModalOpen(true); }} className="rounded-lg p-2 hover:bg-muted" title="Details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-muted" onClick={() => handleEditClick(bank)} title="Modifier">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(bank.id, bank.name)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Informations bancaires" size="lg">
        {selectedBank && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <BankLogo bank={selectedBank} size="lg" />
              <div>
                <h3 className="text-2xl font-bold">{selectedBank.name}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedBank.country || '-'}</Badge>
                  <Badge variant={statusVariant(selectedBank.status)}>{statusLabel[selectedBank.status] || selectedBank.status}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email banque</p>
                <p className="font-medium">{selectedBank.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Site web</p>
                <p className="font-medium">{selectedBank.websiteUrl || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{selectedBank.description || 'Aucune description'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annee d'etablissement</p>
                <p className="font-medium">{getYear(selectedBank) || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                <p className="text-xl font-medium text-primary">{getUsers(selectedBank).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slug</p>
                <code className="rounded bg-muted px-2 py-1 text-sm">{selectedBank.slug}.lvh.me</code>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <a href={`http://${selectedBank.slug}.lvh.me:5173`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full" icon={<ExternalLink className="h-4 w-4" />}>Voir la marketplace</Button>
              </a>
              <Button
                variant={selectedBank.status === 'active' ? 'danger' : 'success'}
                onClick={() => handleStatusToggle(selectedBank)}
                className="flex-1"
                icon={selectedBank.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              >
                {selectedBank.status === 'active' ? 'Desactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier la banque" size="lg">
        {renderForm(editForm, setEditForm, handleUpdateSubmit, 'Sauvegarder les modifications')}
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Enregistrer une nouvelle banque" size="lg">
        {renderForm(newBank, setNewBank, handleCreateSubmit, 'Creer la banque')}
      </Modal>
    </div>
  );
}
