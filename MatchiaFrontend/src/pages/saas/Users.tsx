import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Mail, Shield, CheckCircle, XCircle, Upload } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { bankService } from '../../services/bankService';
import type { Bank } from '../../types';

const USER_ROLES = ['ADMIN_SAAS', 'ADMIN_BANK', 'CLIENT'] as const;
type UserRoleOption = (typeof USER_ROLES)[number];
type UserRole = UserRoleOption | string;
type UserStatus = 'active' | 'inactive' | string;

const normalizeUserRole = (value?: string | null): UserRoleOption => {
  if (value === 'ADMIN_SAAS' || value === 'ADMIN_BANK' || value === 'CLIENT') {
    return value;
  }
  if (value === 'SUPER_ADMIN') {
    return 'ADMIN_SAAS';
  }
  if (value === 'ADMIN' || value === 'BANK_ADMIN' || value === 'MANAGER' || value === 'USER') {
    return 'ADMIN_BANK';
  }
  return 'ADMIN_BANK';
};

const formatRoleLabel = (role?: string | null) => {
  if (role === 'ADMIN_SAAS') return 'Admin SaaS';
  if (role === 'ADMIN_BANK') return 'Admin banque';
  if (role === 'CLIENT') return 'Client';
  return role || '-';
};

type UserFormState = {
  fullName: string;
  email: string;
  phone: string;
  bankId: string;
  role: UserRole;
  status: UserStatus;
  password: string;
  contactImageUrl: string;
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
  const [contactImageFile, setContactImageFile] = useState<File | null>(null);
  const [contactImagePreviewUrl, setContactImagePreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const emptyUserForm: UserFormState = {
    fullName: '',
    email: '',
    phone: '',
    bankId: '',
    role: 'ADMIN_BANK' as UserRole,
    status: 'active' as UserStatus,
    password: '',
    contactImageUrl: '',
  };
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);

  useEffect(() => {
    return () => {
      if (contactImagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(contactImagePreviewUrl);
      }
    };
  }, [contactImagePreviewUrl]);

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
    setContactImageFile(null);
    setContactImagePreviewUrl('');
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
      role: normalizeUserRole(user.role),
      status: user.status || 'active',
      password: '',
      contactImageUrl: user.contactImageUrl || '',
    });
    setContactImageFile(null);
    setContactImagePreviewUrl(getBackendAssetUrl(user.contactImageUrl));
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleContactImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCreateError("L'image doit etre au format PNG, JPG, WEBP ou SVG.");
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCreateError("L'image ne doit pas depasser 2 Mo.");
      event.target.value = '';
      return;
    }

    setCreateError('');
    setContactImageFile(file);
    setContactImagePreviewUrl((previous) => {
      if (previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return URL.createObjectURL(file);
    });
  };

  const clearSelectedContactImage = () => {
    setContactImageFile(null);
    setContactImagePreviewUrl(userForm.contactImageUrl ? getBackendAssetUrl(userForm.contactImageUrl) : '');
  };

  const uploadContactImage = async (file: File) => {
    const formData = new FormData();
    formData.append('contactImage', file);

    const response = await apiClient.post<{ contactImageUrl: string }>(
      '/api/v1/users/upload-contact-image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return response.data.contactImageUrl;
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

      const contactImageUrl = contactImageFile
        ? await uploadContactImage(contactImageFile)
        : userForm.contactImageUrl || null;

      const payload = {
        fullName,
        email,
        phone: userForm.phone.trim() || null,
        bankId,
        role: userForm.role,
        status: userForm.status,
        contactImageUrl,
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

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des utilisateurs</h1>
         
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={openCreateModal}
        >
          Ajouter un administrateur
        </Button>
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
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
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
                              variant={user.role === 'ADMIN_SAAS' ? 'warning' : user.role === 'ADMIN_BANK' ? 'default' : 'secondary'}
                              className="flex items-center justify-center gap-1 mx-auto w-fit"
                            >
                              <Shield className="w-3 h-3" />
                              {formatRoleLabel(user.role)}
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
            <label className="block text-sm font-medium mb-2">Image de contact</label>
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <input
                id="contact-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={handleContactImageChange}
              />
              <label
                htmlFor="contact-image-upload"
                className="flex cursor-pointer items-center gap-4"
              >
                {contactImagePreviewUrl ? (
                  <img
                    src={contactImagePreviewUrl}
                    alt={userForm.fullName || 'Aperçu de l utilisateur'}
                    className="h-16 w-16 rounded-full border border-border object-cover bg-background"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {contactImageFile?.name || (userForm.contactImageUrl ? 'Image actuelle' : 'Choisir une image')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, WEBP ou SVG, max. 2 Mo
                  </p>
                </div>
              </label>
              {contactImageFile && (
                <div className="mt-3">
                  <Button type="button" variant="outline" onClick={clearSelectedContactImage}>
                    Annuler la selection
                  </Button>
                </div>
              )}
            </div>
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
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                    {formatRoleLabel(role)}
                </option>
              ))}
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
