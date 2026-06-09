import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { bankService } from '../../services/bankService';
import type { Bank } from '../../types';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | string;
type UserStatus = 'active' | 'inactive' | string;

type UserFormState = {
  fullName: string;
  email: string;
  phone: string;
  bankId: string;
  role: UserRole;
  status: UserStatus;
  password: string;
};

interface UserDto {
  id: number;
  bankId?: number | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  contactImageUrl?: string | null;
  role?: UserRole;
  status?: UserStatus;
  createdAt?: string | null;
  created_at?: string | null;
}

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

export function SaaSUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
  const [users, setUsers] = useState<UserDto[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const emptyUserForm: UserFormState = {
    fullName: '',
    email: '',
    phone: '',
    bankId: '',
    role: 'ADMIN' as UserRole,
    status: 'active' as UserStatus,
    password: '',
  };
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const [usersResponse, banksResponse] = await Promise.all([
          apiClient.get<UserDto[]>('/api/v1/users'),
          bankService.getAllBanks(),
        ]);

        if (isMounted) {
          setUsers(usersResponse.data || []);
          setBanks(banksResponse || []);
        }
      } catch (err) {
        console.error('Failed to load users', err);
        if (isMounted) {
          setError('Impossible de charger la liste des utilisateurs.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const bankMap = useMemo(
    () => new Map(banks.map((bank) => [bank.id, bank])),
    [banks]
  );

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(emptyUserForm);
    setCreateError('');
  };

  const openCreateModal = () => {
    resetUserForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserDto) => {
    setEditingUserId(user.id);
    setUserForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      bankId: user.bankId ? String(user.bankId) : '',
      role: user.role || 'ADMIN',
      status: user.status || 'active',
      password: '',
    });
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleSubmitUser = async () => {
    const fullName = userForm.fullName.trim();
    const email = userForm.email.trim();
    const password = userForm.password.trim();
    const bankId = Number(userForm.bankId);
    const isEditing = editingUserId !== null;

    if (!fullName || !email || Number.isNaN(bankId) || (!isEditing && !password)) {
      setCreateError(
        isEditing
          ? 'Veuillez remplir le nom, l email et la banque.'
          : 'Veuillez remplir le nom, l email, le mot de passe et la banque.'
      );
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');

      const payload = {
        fullName,
        email,
        phone: userForm.phone.trim() || null,
        bankId,
        role: userForm.role,
        status: userForm.status,
        password: password || undefined,
      };

      const response = isEditing
        ? await apiClient.put<UserDto>(`/api/v1/users/${editingUserId}`, payload)
        : await apiClient.post<UserDto>('/api/v1/users', payload);

      setUsers((prev) =>
        isEditing
          ? prev.map((item) => (item.id === editingUserId ? response.data : item))
          : [response.data, ...prev]
      );
      resetUserForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save user', err);
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : null;
      setCreateError(message || 'Impossible d enregistrer cet utilisateur.');
    } finally {
      setIsCreating(false);
    }
  };

  const approvedUsers = useMemo(
    () => users
      .filter((user) => user.bankId != null)
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()),
    [users]
  );

  const getBank = (bankId?: number | null) => (bankId ? bankMap.get(bankId) : undefined);

  const getBankName = (bankId?: number | null) => {
    if (!bankId) return 'Banque non associée';
    return getBank(bankId)?.name || `Banque #${bankId}`;
  };

  const filtered = approvedUsers.filter((user) => {
    const bankName = getBankName(user.bankId);
    const fullName = user.fullName || '';
    const email = user.email || '';

    const matchesSearch =
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bankName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = [
    {
      label: 'Comptes liés aux banques',
      value: approvedUsers.length,
      color: 'text-primary',
    },
    {
      label: 'ADMIN',
      value: approvedUsers.filter((user) => user.role === 'ADMIN').length,
      color: 'text-purple-600',
    },
    {
      label: 'Actifs',
      value: approvedUsers.filter((user) => user.status === 'active').length,
      color: 'text-green-600',
    },
    {
      label: 'Banques couvertes',
      value: new Set(approvedUsers.map((user) => user.bankId).filter(Boolean)).size,
      color: 'text-secondary',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Comptes créés automatiquement lors de l’approbation des demandes.
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={openCreateModal}
        >
          Ajouter un administrateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <div className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rechercher par nom, email ou banque</label>
              <Input
                placeholder="Tapez pour rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les rôles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="USER">USER</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des administrateurs de banque</CardTitle>
          <CardDescription>
            Affichage des comptes générés lors de l’approbation des demandes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Chargement des utilisateurs...</div>
          ) : error ? (
            <div className="py-8 text-center text-error">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Nom</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Banque</th>
                    <th className="text-center py-3 px-4 font-semibold">Rôle</th>
                    <th className="text-center py-3 px-4 font-semibold">Statut</th>
                    <th className="text-center py-3 px-4 font-semibold">Depuis</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((user) => {
                      const avatarUrl = getBackendAssetUrl(user.contactImageUrl);
                      const createdAt = user.createdAt || user.created_at;

                      return (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={user.fullName || 'Administrateur'}
                                  className="w-10 h-10 rounded-full border border-border object-contain bg-white p-1"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                                  {(user.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="font-medium text-foreground">{user.fullName || '-'}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {user.email || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {getBankName(user.bankId)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                              className="flex items-center justify-center gap-1 mx-auto w-fit"
                            >
                              <Shield className="w-3 h-3" />
                              {user.role || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.status === 'active' ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Actif</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Inactif</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground text-xs">
                            {createdAt ? new Date(createdAt).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title="Edit"
                                onClick={() => openEditModal(user)}
                              >
                                <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </button>
                              <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetUserForm();
        }}
        title={editingUserId ? 'Modifier un administrateur' : 'Ajouter un administrateur'}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmitUser();
          }}
        >
          {createError && <p className="text-sm text-error">{createError}</p>}
          <div>
            <label className="block text-sm font-medium mb-2">Nom complet</label>
            <Input
              placeholder="Nom de l'administrateur"
              value={userForm.fullName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              placeholder="email@banque.com"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Telephone</label>
            <Input
              type="tel"
              placeholder="+216 55 123 456"
              value={userForm.phone}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Banque</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={userForm.bankId}
              onChange={(e) => setUserForm((prev) => ({ ...prev, bankId: e.target.value }))}
            >
              <option value="">Sélectionner une banque</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rôle</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {editingUserId ? 'Nouveau mot de passe temporaire' : 'Mot de passe temporaire'}
            </label>
            <Input
              type="password"
              placeholder="********"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetUserForm();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Enregistrement...' : editingUserId ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
