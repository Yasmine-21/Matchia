import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Loader2,
  Shield,
  Search,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useBankTenant } from '../../hooks/useBankTenant';
import { getBackendAssetUrl } from '../../utils/tenant';
import { userService, type UserPayload } from '../../services/userService';
import type { UserDto } from '../../types/apiTypes';

const USER_ROLES = ['ADMIN_BANK', 'CLIENT'] as const;
type UserRole = (typeof USER_ROLES)[number];
type UserStatus = 'active' | 'inactive';

const roleVariant = (role?: string | null): 'default' | 'primary' | 'success' | 'warning' => {
  if (role === 'ADMIN_SAAS') return 'warning';
  if (role === 'ADMIN_BANK') return 'primary';
  return 'default';
};

const normalizeRole = (role?: string | null): UserRole => {
  if (role === 'ADMIN_BANK' || role === 'CLIENT') {
    return role;
  }
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BANK_ADMIN' || role === 'MANAGER' || role === 'USER') {
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

const normalizeStatus = (status?: string | null): UserStatus => {
  if (status === 'inactive') return 'inactive';
  return 'active';
};

type UserFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  contactImageUrl: string;
};

const createEmptyForm = (): UserFormState => ({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'ADMIN_BANK',
  status: 'active',
  contactImageUrl: '',
});

export function BankUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyForm);
  const [contactImageFile, setContactImageFile] = useState<File | null>(null);
  const [contactImagePreviewUrl, setContactImagePreviewUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const { users, isLoading, error, marketplace, refresh } = useBankTenant();

  useEffect(() => {
    return () => {
      if (contactImagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(contactImagePreviewUrl);
      }
    };
  }, [contactImagePreviewUrl]);

  const resetForm = () => {
    setEditingUserId(null);
    setUserForm(createEmptyForm());
    setContactImageFile(null);
    setContactImagePreviewUrl('');
    setShowPassword(false);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setActionError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserDto) => {
    setEditingUserId(user.id);
    setUserForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: normalizeRole(user.role),
      status: normalizeStatus(user.status),
      contactImageUrl: user.contactImageUrl || '',
    });
    setContactImageFile(null);
    setContactImagePreviewUrl(getBackendAssetUrl(user.contactImageUrl));
    setShowPassword(false);
    setFormError('');
    setActionError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleContactImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError("L'image doit etre au format PNG, JPG, WEBP ou SVG.");
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError("L'image ne doit pas depasser 2 Mo.");
      event.target.value = '';
      return;
    }

    setFormError('');
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

  const handleSubmitUser = async () => {
    const fullName = userForm.fullName.trim();
    const email = userForm.email.trim();
    const phone = userForm.phone.trim();
    const password = userForm.password.trim();
    const bankId = marketplace?.bankId ?? null;

    if (!bankId) {
      setFormError("Impossible d'identifier la banque courante.");
      return;
    }

    if (!fullName || !email) {
      setFormError('Veuillez renseigner le nom complet et l email.');
      return;
    }

    if (!editingUserId && !password) {
      setFormError('Veuillez renseigner le mot de passe.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      setActionError('');

      const contactImageUrl = contactImageFile
        ? await userService.uploadContactImage(contactImageFile)
        : userForm.contactImageUrl || null;

      const payload: UserPayload = {
        bankId,
        fullName,
        email,
        phone: phone || null,
        contactImageUrl,
        role: userForm.role,
        status: userForm.status,
        password: password || undefined,
      };

      if (editingUserId) {
        await userService.update(editingUserId, payload);
      } else {
        await userService.create(payload);
      }

      closeModal();
      refresh();
    } catch (err) {
      console.error('Failed to save user', err);
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : null;
      setFormError(message || "Impossible d'enregistrer cet utilisateur.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserDto) => {
    if (!window.confirm(`Supprimer ${user.fullName || 'cet utilisateur'} ?`)) {
      return;
    }

    try {
      setIsSaving(true);
      setActionError('');
      await userService.delete(user.id);
      refresh();
    } catch (err) {
      console.error('Failed to delete user', err);
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : null;
      setActionError(message || "Impossible de supprimer cet utilisateur.");
    } finally {
      setIsSaving(false);
    }
  };

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || 0).getTime() -
          new Date(a.createdAt || a.created_at || 0).getTime(),
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return sortedUsers.filter((user) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && normalizeStatus(user.status) === 'active') ||
        (statusFilter === 'inactive' && normalizeStatus(user.status) === 'inactive');

      const matchesSearch = [
        user.fullName || '',
        user.email || '',
        user.phone || '',
        user.role || '',
      ].some((value) => value.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [sortedUsers, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            {marketplace?.bankName
              ? `Utilisateurs de ${marketplace.bankName}`
              : 'Utilisateurs de la marketplace courante'}
          </p>
        </div>
        <Button icon={<Plus className="h-5 w-5" />} onClick={openCreateModal}>
          Ajouter un utilisateur
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Rechercher par nom, email, téléphone ou rôle.</CardDescription>
        </CardHeader>
        <CardContent>
          {actionError && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {actionError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <Input
              label="Rechercher par nom, email ou téléphone"
              placeholder="Tapez pour rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-10"
            />

            <div>
              <label className="mb-2 block text-sm text-foreground">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>Tous les comptes rattachés à la marketplace courante</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left">Nom</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Téléphone</th>
                    <th className="px-4 py-3 text-left">Rôle</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const avatarUrl = getBackendAssetUrl(user.contactImageUrl);
                      const isActive = normalizeStatus(user.status) === 'active';

                      return (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={user.fullName || 'Utilisateur'}
                                  className="h-10 w-10 rounded-full border border-border object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                  {(user.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="font-medium">{user.fullName || '-'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {user.email || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {user.phone || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={roleVariant(user.role)}>
                              <span className="inline-flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {formatRoleLabel(user.role)}
                              </span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={isActive ? 'success' : 'default'}>
                              <span className="inline-flex items-center gap-1">
                                {isActive ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {isActive ? 'Actif' : 'Inactif'}
                              </span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="rounded-lg p-2 transition-colors hover:bg-muted"
                                title="Modifier"
                                onClick={() => openEditModal(user)}
                                disabled={isSaving}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                                title="Supprimer"
                                onClick={() => void handleDeleteUser(user)}
                                disabled={isSaving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Aucun utilisateur trouvé pour cette marketplace.
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
        onClose={closeModal}
        title={editingUserId ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmitUser();
          }}
        >
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <p className="text-sm text-muted-foreground">
            Les champs du formulaire correspondent aux informations affichées dans la liste.
          </p>


          <div>
            <label className="mb-2 block text-sm font-medium">Nom complet</label>
            <Input
              placeholder="Nom de l'utilisateur"
              value={userForm.fullName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="email@banque.com"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Téléphone</label>
            <Input
              type="tel"
              placeholder="+216 55 123 456"
              value={userForm.phone}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Rôle</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                value={userForm.role}
                onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Statut</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                value={userForm.status}
                onChange={(e) => setUserForm((prev) => ({ ...prev, status: e.target.value as UserStatus }))}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {editingUserId ? 'Nouveau mot de passe' : 'Mot de passe'}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={editingUserId ? 'Laisser vide pour conserver le mot de passe actuel' : 'Saisir le mot de passe'}
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Image de contact</label>
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <input
                id="contact-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={handleContactImageChange}
              />
              <label htmlFor="contact-image-upload" className="flex cursor-pointer items-center gap-4">
                {contactImagePreviewUrl ? (
                  <img
                    src={contactImagePreviewUrl}
                    alt={userForm.fullName || 'Aperçu utilisateur'}
                    className="h-16 w-16 rounded-full border border-border bg-background object-cover"
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
                  <p className="text-sm text-muted-foreground">PNG, JPG, WEBP ou SVG, max. 2 Mo</p>
                </div>
              </label>

              {(contactImageFile || userForm.contactImageUrl) && (
                <div className="mt-3">
                  <Button type="button" variant="outline" onClick={clearSelectedContactImage}>
                    Annuler la sélection
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </span>
              ) : editingUserId ? (
                'Modifier'
              ) : (
                'Créer'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
