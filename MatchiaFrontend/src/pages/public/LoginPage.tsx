import '../../styles/LoginPage.css';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { MatchiaLogo } from '../../components/brand/MatchiaLogo';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { bankService } from '../../services/bankService';
import apiClient from '../../api/apiClient';
import type { MarketplacePublicDto } from '../../types/apiTypes';
import { getBackendAssetUrl, getTenantSlugFromLocation } from '../../utils/tenant';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setCurrentBank } = useApp();
  const tenantSlug = getTenantSlugFromLocation();
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadMarketplace = async () => {
      if (!tenantSlug) {
        if (mounted) {
          setMarketplace(null);
        }
        return;
      }

      try {
        const response = await apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/public/slug/${tenantSlug}`);
        if (mounted) {
          setMarketplace(response.data);
        }
      } catch (loadError) {
        console.warn('Unable to load marketplace theme for login page:', loadError);
        if (mounted) {
          setMarketplace(null);
        }
      }
    };

    loadMarketplace();

    return () => {
      mounted = false;
    };
  }, [tenantSlug]);

  const primaryColor = marketplace?.primaryColor || '#2563EB';
  const secondaryColor = marketplace?.secondaryColor || '#F97316';
  const marketplaceLogoUrl = getBackendAssetUrl(marketplace?.logoImageUrl || marketplace?.bankLogoUrl);
  const loginStyles = useMemo(() => ({
    background: marketplace
      ? `radial-gradient(circle at 18% 76%, ${primaryColor}26, transparent 28%), radial-gradient(circle at 82% 9%, ${secondaryColor}20, transparent 22%), linear-gradient(135deg, #fbf9ff 0%, #eef4ff 45%, #f8fbff 100%)`
      : undefined,
    '--login-primary': primaryColor,
    '--login-secondary': secondaryColor,
    '--login-primary-soft': `${primaryColor}15`,
    '--login-border-soft': `${primaryColor}24`,
  } as CSSProperties), [marketplace, primaryColor, secondaryColor]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);

      if (user) {
        login(user);

        if (user.bank_id) {
          try {
            const bank = await bankService.getBankById(Number(user.bank_id));
            setCurrentBank(bank);
          } catch (bankError) {
            console.warn('Unable to hydrate current bank context:', bankError);
            setCurrentBank(null);
          }
        } else {
          setCurrentBank(null);
        }
        
        const redirectUrl = (location.state as { from?: string } | null)?.from || authService.getRedirectUrl(user);
        navigate(redirectUrl, { replace: true });

      } else {
        setError('Identifiants invalides.');
        setLoading(false);
      }
    } catch {
      setError('Une erreur s\'est produite lors de la connexion.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page-body" style={loginStyles}>
      <div className="login-background-orb login-background-orb-top" />
      <div className="login-background-orb login-background-orb-bottom" />
      <div className="login-dot-grid login-dot-grid-left" />
      <div className="login-dot-grid login-dot-grid-right" />
      <div className="login-dot-grid login-dot-grid-bottom" />

      <div className="login-split-wrapper">
        {marketplace && <div className="login-theme-strip" />}
        <div className="login-split-right">
          <div className="login-form-wrapper">
            <div className="login-logo-wrap">
              {marketplaceLogoUrl ? (
                <img
                  src={marketplaceLogoUrl}
                  alt={marketplace?.bankName || 'Marketplace'}
                  className="login-logo-image"
                />
              ) : (
                <MatchiaLogo
                  variant="full"
                  markClassName="login-logo-mark"
                />
              )}
            </div>

            <h2 className="login-form-title">
              {marketplace?.bankName ? `Connexion à ${marketplace.bankName}` : 'Connexion'}
            </h2>
            <p className="login-form-subtitle">
              {marketplace?.bankName
                ? `Saisissez vos identifiants pour accéder à ${marketplace.bankName}.`
                : 'Saisissez vos identifiants pour acceder a la plateforme.'}
            </p>

            <form onSubmit={handleLogin} className="login-form">
              {error && (
                <div className="login-error-message">
                  {error}
                </div>
              )}

              <div className="login-input-group">
                <Mail className="login-input-icon" />
                <input
                  type="text"
                  className="login-custom-input"
                  placeholder="Identifiant ou e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-input-group">
                <Lock className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-custom-input login-password-input"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="login-password-icon" />
                  ) : (
                    <Eye className="login-password-icon" />
                  )}
                </button>
              </div>

              <div className="login-form-options">
                <label className="login-checkbox-wrapper">
                  <input type="checkbox" className="login-checkbox" defaultChecked />
                  <span>Se souvenir de moi</span>
                </label>
                <Link to="/mot-de-passe-oublie" className="login-forgot-link">
                  Mot de passe oublie ?
                </Link>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? 'CONNEXION EN COURS...' : 'Se connecter'}
              </button>
            </form>

            <div className="login-divider">
              <span>ou</span>
            </div>

            <Link to={tenantSlug ? "/inscription" : "/rejoindre"} className="login-create-account">
              <UserRound className="login-create-icon" />
              Creer un compte
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
