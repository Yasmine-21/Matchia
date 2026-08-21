import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Camera, CheckCircle2, Mail, MapPin, Pencil, Phone, Shield, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { userService } from '../../services/userService';
import type { User as AppUser } from '../../types';
import type { UserDto } from '../../types/apiTypes';
import { resolveApiUrl } from '../../api/apiClient';

interface ProfileSettingsPageProps {
  type: 'saas' | 'bank' | 'dealer';
}

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
};

const getRoleLabel = (role?: string | null) => {
  if (role === 'ADMIN_SAAS' || role === 'SAAS_ADMIN' || role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN_BANK' || role === 'BANK_ADMIN' || role === 'ADMIN' || role === 'MANAGER') return 'Admin banque';
  if (role === 'DEALER_ADMIN') return 'Admin concessionnaire';
  if (role === 'CLIENT') return 'Client';
  return 'Utilisateur';
};

const getNameParts = (name?: string | null) => {
  const normalized = (name || '').trim();
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const buildProfileState = (user: AppUser | null): ProfileFormState => {
  const nameParts = getNameParts(user?.name);
  return {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  };
};

const normalizeRole = (role?: string | null): AppUser['role'] => {
  if (role === 'ADMIN_SAAS' || role === 'SAAS_ADMIN' || role === 'SUPER_ADMIN') return 'ADMIN_SAAS';
  if (role === 'ADMIN_BANK' || role === 'BANK_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'USER') return 'ADMIN_BANK';
  if (role === 'CLIENT') return 'CLIENT';
  if (role === 'DEALER_ADMIN') return 'DEALER_ADMIN';
  return 'CLIENT';
};

const toAppUser = (dto: UserDto, fallback: AppUser): AppUser => ({
  id: dto.id != null ? String(dto.id) : fallback.id,
  name: dto.fullName?.trim() || fallback.name,
  email: dto.email?.trim() || fallback.email,
  phone: dto.phone ?? fallback.phone ?? null,
  address: dto.address ?? fallback.address ?? null,
  role: normalizeRole(dto.role || fallback.role),
  bank_id: dto.bankId != null ? String(dto.bankId) : fallback.bank_id,
  contactImageUrl: dto.contactImageUrl ?? fallback.contactImageUrl ?? null,
  status: dto.status && dto.status.toLowerCase() === 'inactive' ? 'inactive' : fallback.status || 'active',
  created_at: dto.createdAt || fallback.created_at || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function ProfileSettingsPage({ type }: ProfileSettingsPageProps) {
  const navigate = useNavigate();
  const { currentUser, isLoading, login } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(buildProfileState(currentUser));
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');

  useEffect(() => {
    setProfileForm(buildProfileState(currentUser));
    setProfileImageUrl(resolveApiUrl(currentUser?.contactImageUrl || null));
    setFeedback(null);
    setIsEditing(false);
  }, [currentUser]);

  const displayName = useMemo(() => currentUser?.name || '-', [currentUser?.name]);
  const roleLabel = useMemo(() => getRoleLabel(currentUser?.role), [currentUser?.role]);
  const displayPhone = currentUser?.phone || '-';
  const displayEmail = currentUser?.email || '-';
  const displayAddress = currentUser?.address || '-';
  const currentImage = profileImageUrl || resolveApiUrl(currentUser?.contactImageUrl || null);

  const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleCancel = () => {
    setProfileForm(buildProfileState(currentUser));
    setProfileImageUrl(resolveApiUrl(currentUser?.contactImageUrl || null));
    setFeedback(null);
    setIsEditing(false);
  };

  const updateCurrentUserInSession = (savedUser: AppUser) => {
    login(savedUser);
  };

  const buildSavePayload = () => ({
    bankId: currentUser?.bank_id ? Number(currentUser.bank_id) : null,
    fullName: `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim(),
    email: profileForm.email.trim(),
    phone: profileForm.phone.trim(),
    address: profileForm.address.trim(),
    contactImageUrl: currentUser?.contactImageUrl || null,
    role: currentUser?.role || 'CLIENT',
    status: currentUser?.status || 'active',
  });

  const handleSave = async () => {
    if (!currentUser?.id) {
      setFeedback({ type: 'error', message: 'Impossible de mettre à jour le profil sans utilisateur connecté.' });
      return;
    }
    const userId = Number(currentUser.id);
    if (!Number.isFinite(userId)) {
      setFeedback({ type: 'error', message: 'Impossible de déterminer l’utilisateur à mettre à jour.' });
      return;
    }

    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      setFeedback({ type: 'error', message: 'Le nom et le prénom sont obligatoires.' });
      return;
    }
    if (!profileForm.email.trim()) {
      setFeedback({ type: 'error', message: 'L’adresse email est obligatoire.' });
      return;
    }
    if (!profileForm.phone.trim()) {
      setFeedback({ type: 'error', message: 'Le numéro de téléphone est obligatoire.' });
      return;
    }
    if (!profileForm.address.trim()) {
      setFeedback({ type: 'error', message: 'L’adresse est obligatoire.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const saved = await userService.update(userId, buildSavePayload());
      const updatedUser = toAppUser(saved, currentUser);
      setProfileForm(buildProfileState(updatedUser));
      setProfileImageUrl(resolveApiUrl(updatedUser.contactImageUrl || null));
      updateCurrentUserInSession(updatedUser);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profil mis à jour avec succès.' });
    } catch (error) {
      console.error('Failed to save profile:', error);
      setFeedback({ type: 'error', message: 'Impossible d’enregistrer les modifications. Veuillez réessayer.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !currentUser?.id) {
      return;
    }
    const userId = Number(currentUser.id);
    if (!Number.isFinite(userId)) {
      setFeedback({ type: 'error', message: 'Impossible de déterminer l’utilisateur à mettre à jour.' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Le fichier sélectionné doit être une image.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'La photo doit peser au maximum 2 Mo.' });
      return;
    }

    setIsUploadingPhoto(true);
    setFeedback(null);

    try {
      const uploadedImageUrl = await userService.uploadContactImage(file);
      const nextContactImageUrl = uploadedImageUrl || null;
      const saved = await userService.update(userId, {
        ...buildSavePayload(),
        contactImageUrl: nextContactImageUrl,
      });

      const updatedUser = toAppUser(saved, currentUser);
      setProfileImageUrl(resolveApiUrl(updatedUser.contactImageUrl || null));
      setProfileForm(buildProfileState(updatedUser));
      updateCurrentUserInSession(updatedUser);
      setFeedback({ type: 'success', message: 'Photo de profil mise à jour avec succès.' });
    } catch (error) {
      console.error('Failed to update profile image:', error);
      setFeedback({ type: 'error', message: 'Impossible de mettre à jour la photo de profil.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card className="mx-auto max-w-3xl border-dashed">
        <CardContent className="py-12 text-center">
          <User className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Profil indisponible</h1>
          <p className="text-muted-foreground">
            Aucune information de session n&apos;est disponible pour l&apos;utilisateur connecté.
          </p>
        </CardContent>
      </Card>
    );
  }

  const inputClassName =
    'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Paramètres du profil</h1>
          <p className="mt-2 text-muted-foreground">
            Consultez les informations du compte actuellement connecté.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate(type === 'saas' ? '/saas/dashboard' : type === 'bank' ? '/bank/dashboard' : '/dealer/dashboard')}
        >
          Retour au tableau de bord
        </Button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="w-full border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-5">
              <div className="text-sm font-semibold text-slate-900 self-start">Photo de profil</div>

              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm">
                  {currentImage ? (
                    <img src={currentImage} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-14 w-14 text-slate-300" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md">
                  <Camera className="h-4 w-4" />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelection}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                loading={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                Changer la photo
              </Button>
              <p className="text-[11px] text-slate-400">JPG ou PNG, max 2MB</p>

              <div className="my-2 h-px w-full bg-slate-200" />

              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900">{displayName}</h3>
                <p className="mt-1 text-sm text-slate-500">{roleLabel}</p>
              </div>

              <div className="w-full space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 break-words">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{displayEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{displayPhone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span className="break-words">{displayAddress}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Informations personnelles</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Les champs sont en lecture seule tant que le mode modification n’est pas activé.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="primary"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => setIsEditing(true)}
                    >
                      Modifier
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving || isUploadingPhoto}>
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        loading={isSaving}
                        onClick={handleSave}
                        disabled={isUploadingPhoto}
                      >
                        Enregistrer
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="md:col-span-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Nom</span>
                  <input
                    type="text"
                    className={inputClassName}
                    value={profileForm.firstName}
                    onChange={(event) => handleFieldChange('firstName', event.target.value)}
                    readOnly={!isEditing}
                  />
                </label>

                <label className="md:col-span-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Prénom</span>
                  <input
                    type="text"
                    className={inputClassName}
                    value={profileForm.lastName}
                    onChange={(event) => handleFieldChange('lastName', event.target.value)}
                    readOnly={!isEditing}
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</span>
                  <input
                    type="email"
                    className={inputClassName}
                    value={profileForm.email}
                    onChange={(event) => handleFieldChange('email', event.target.value)}
                    readOnly={!isEditing}
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Numéro de téléphone</span>
                  <input
                    type="tel"
                    className={inputClassName}
                    value={profileForm.phone}
                    onChange={(event) => handleFieldChange('phone', event.target.value)}
                    readOnly={!isEditing}
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Adresse</span>
                  <textarea
                    className={`${inputClassName} min-h-[110px] resize-none`}
                    value={profileForm.address}
                    onChange={(event) => handleFieldChange('address', event.target.value)}
                    readOnly={!isEditing}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="h-4 w-4" />
                  <span>Les informations affichées proviennent du compte connecté.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
