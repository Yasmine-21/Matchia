import '../../styles/LoginPage.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  CalendarDays,
  Camera,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from 'lucide-react';
import { MatchiaLogo } from '../../components/brand/MatchiaLogo';
import apiClient from '../../api/apiClient';
import { financingRequestService } from '../../services/financingRequestService';
import type { MarketplacePublicDto } from '../../types/apiTypes';
import { getBackendAssetUrl, getTenantSlugFromLocation } from '../../utils/tenant';

type RegistrationForm = {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
  password: string;
  confirmPassword: string;
};

type FormField = keyof RegistrationForm | 'photo';
type FormErrors = Partial<Record<FormField, string>>;

const initialForm: RegistrationForm = {
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  address: '',
  password: '',
  confirmPassword: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const acceptedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maximumPhotoSize = 5 * 1024 * 1024;

export function ClientRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bankSlug = getTenantSlugFromLocation() || '';
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadMarketplace = async () => {
      if (!bankSlug) {
        setMarketplace(null);
        return;
      }

      try {
        const response = await apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/public/slug/${bankSlug}`);
        if (mounted) setMarketplace(response.data);
      } catch (loadError) {
        console.warn('Unable to load marketplace theme for registration page:', loadError);
        if (mounted) setMarketplace(null);
      }
    };

    void loadMarketplace();
    return () => { mounted = false; };
  }, [bankSlug]);

  useEffect(() => () => {
    if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
  }, [profilePhotoPreview]);

  const primaryColor = marketplace?.primaryColor || '#2563EB';
  const secondaryColor = marketplace?.secondaryColor || '#9333EA';
  const marketplaceLogoUrl = getBackendAssetUrl(marketplace?.logoImageUrl || marketplace?.bankLogoUrl);
  const registrationStyles = useMemo(() => ({
    background: marketplace
      ? `radial-gradient(circle at 18% 76%, ${primaryColor}26, transparent 28%), radial-gradient(circle at 82% 9%, ${secondaryColor}20, transparent 22%), linear-gradient(135deg, #fbf9ff 0%, #eef4ff 45%, #f8fbff 100%)`
      : undefined,
    '--login-primary': primaryColor,
    '--login-secondary': secondaryColor,
    '--login-primary-soft': `${primaryColor}15`,
    '--login-border-soft': `${primaryColor}24`,
  } as CSSProperties), [marketplace, primaryColor, secondaryColor]);

  const updateField = (field: keyof RegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!acceptedPhotoTypes.has(file.type)) {
      setErrors((current) => ({ ...current, photo: 'Utilisez une image JPG, PNG ou WEBP.' }));
      event.target.value = '';
      return;
    }

    if (file.size > maximumPhotoSize) {
      setErrors((current) => ({ ...current, photo: 'La photo ne doit pas dépasser 5 Mo.' }));
      event.target.value = '';
      return;
    }

    setErrors((current) => ({ ...current, photo: undefined }));
    setProfilePhoto(file);
    setProfilePhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Le nom complet est obligatoire.';
    if (!form.email.trim()) nextErrors.email = 'L’e-mail est obligatoire.';
    else if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Saisissez une adresse e-mail valide.';
    if (!form.phone.trim()) nextErrors.phone = 'Le téléphone est obligatoire.';
    if (!form.birthDate) nextErrors.birthDate = 'La date de naissance est obligatoire.';
    if (!form.address.trim()) nextErrors.address = 'L’adresse est obligatoire.';
    if (!form.password) nextErrors.password = 'Le mot de passe est obligatoire.';
    else if (form.password.length < 8) nextErrors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'La confirmation est obligatoire.';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    return nextErrors;
  };

  const uploadProfilePhoto = async (file: File) => {
    const body = new FormData();
    body.append('contactImage', file);
    const response = await apiClient.post<{ contactImageUrl: string }>('/api/v1/users/upload-contact-image', body);
    return response.data.contactImageUrl;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!bankSlug) {
      setFormError('Cette inscription doit être effectuée depuis une marketplace bancaire.');
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const contactImageUrl = profilePhoto ? await uploadProfilePhoto(profilePhoto) : undefined;
      await financingRequestService.register({
        ...form,
        bankSlug,
        contactImageUrl,
      });
      const from = (location.state as { from?: string } | null)?.from;
      navigate('/connexion', { replace: true, state: from ? { from } : undefined });
    } catch (requestError: any) {
      setFormError(requestError?.response?.data?.message || 'Impossible de créer votre compte.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page-body registration-page-body" style={registrationStyles}>
      <div className="login-background-orb login-background-orb-top" />
      <div className="login-background-orb login-background-orb-bottom" />
      <div className="login-dot-grid login-dot-grid-left" />
      <div className="login-dot-grid login-dot-grid-right" />
      <div className="login-dot-grid login-dot-grid-bottom" />

      <main className="login-split-wrapper registration-card">
        <div className="login-theme-strip" />
        <div className="login-split-right registration-card-content">
          <div className="login-form-wrapper registration-form-wrapper">
            <div className="login-logo-wrap registration-logo-wrap">
              {marketplaceLogoUrl ? (
                <img src={marketplaceLogoUrl} alt={marketplace?.bankName || 'Marketplace'} className="login-logo-image" />
              ) : (
                <MatchiaLogo variant="full" markClassName="login-logo-mark" />
              )}
            </div>

            <h1 className="login-form-title registration-title">Créer mon compte client</h1>
            <p className="login-form-subtitle registration-subtitle">
              Votre compte sera rattaché à cette marketplace bancaire.
            </p>

            <form className="registration-form" onSubmit={submit} noValidate>
              {formError && <div className="login-error-message">{formError}</div>}

              <div className="registration-photo-section">
                <button
                  className="registration-photo-picker"
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  aria-label="Ajouter une photo de profil"
                  disabled={busy}
                >
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="Aperçu de votre photo de profil" />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                  <span className="registration-photo-plus"><Plus aria-hidden="true" /></span>
                </button>
                <input
                  ref={photoInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectPhoto}
                  disabled={busy}
                />
                <div>
                  <p className="registration-photo-label">Photo de profil</p>
                  <p className="registration-photo-help">JPG, PNG ou WEBP · 5 Mo max.</p>
                </div>
                {errors.photo && <p className="registration-field-error registration-photo-error">{errors.photo}</p>}
              </div>

              <div className="registration-grid">
                <RegistrationField label="Nom complet" error={errors.fullName} icon={<UserRound />}>
                  <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} autoComplete="name" disabled={busy} />
                </RegistrationField>
                <RegistrationField label="E-mail" error={errors.email} icon={<Mail />}>
                  <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" disabled={busy} />
                </RegistrationField>
                <RegistrationField label="Téléphone" error={errors.phone} icon={<Phone />}>
                  <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" disabled={busy} />
                </RegistrationField>
                <RegistrationField label="Date de naissance" error={errors.birthDate} icon={<CalendarDays />}>
                  <input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} disabled={busy} />
                </RegistrationField>
                <RegistrationField label="Adresse" error={errors.address} icon={<MapPin />} fullWidth>
                  <input value={form.address} onChange={(event) => updateField('address', event.target.value)} autoComplete="street-address" disabled={busy} />
                </RegistrationField>
                <RegistrationField label="Mot de passe" error={errors.password} icon={<Lock />}>
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" disabled={busy} />
                  <PasswordToggle visible={showPassword} onClick={() => setShowPassword((value) => !value)} disabled={busy} />
                </RegistrationField>
                <RegistrationField label="Confirmation du mot de passe" error={errors.confirmPassword} icon={<Lock />}>
                  <input type={showConfirmation ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} autoComplete="new-password" disabled={busy} />
                  <PasswordToggle visible={showConfirmation} onClick={() => setShowConfirmation((value) => !value)} disabled={busy} />
                </RegistrationField>
              </div>

              <button type="submit" className="login-submit-btn registration-submit-btn" disabled={busy}>
                {busy ? 'Création en cours...' : 'Créer mon compte'}
              </button>
            </form>

            <div className="login-divider registration-divider"><span>ou</span></div>
            <Link to="/connexion" className="login-create-account">
              <UserRound className="login-create-icon" />
              Déjà client ? Se connecter
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function RegistrationField({
  label,
  error,
  icon,
  fullWidth = false,
  children,
}: {
  label: string;
  error?: string;
  icon: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`registration-field${fullWidth ? ' registration-field-wide' : ''}`}>
      <span className="registration-field-label">{label}</span>
      <span className={`login-input-group registration-input-group${error ? ' registration-input-invalid' : ''}`}>
        <span className="login-input-icon" aria-hidden="true">{icon}</span>
        {children}
      </span>
      {error && <span className="registration-field-error">{error}</span>}
    </label>
  );
}

function PasswordToggle({ visible, onClick, disabled }: { visible: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      className="login-password-toggle"
      onClick={onClick}
      aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      aria-pressed={visible}
      disabled={disabled}
    >
      {visible ? <EyeOff className="login-password-icon" /> : <Eye className="login-password-icon" />}
    </button>
  );
}
