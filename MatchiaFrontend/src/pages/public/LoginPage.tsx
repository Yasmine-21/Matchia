import '../../styles/LoginPage.css';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, Lock, Mail, UserRound } from 'lucide-react';
import { MatchiaLogo } from '../../components/brand/MatchiaLogo';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { bankService } from '../../services/bankService';
import apiClient from '../../api/apiClient';
import type { MarketplacePublicDto } from '../../types/apiTypes';
import { getBackendAssetUrl, getTenantSlugFromLocation } from '../../utils/tenant';

type DemoAccountConfig = { role: string; name: string; bankSlug?: string };

const DEMO_ACCOUNTS_LIST: Record<string, DemoAccountConfig> = {
  'admin@matchia.com': { role: 'ADMIN_SAAS', name: 'Mariem Trabelsi' },
  'ahmed@zitouna.com': { role: 'ADMIN_SAAS', name: 'Ahmed Ben Ali', bankSlug: 'zitouna' },
  'fatma@bhbank.com': { role: 'ADMIN_BANK', name: 'Fatma Gharbi', bankSlug: 'bh' },
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, setCurrentBank } = useApp();
  const tenantSlug = getTenantSlugFromLocation();
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Find if this account is associated with a bank
        const accountEntry = Object.entries(DEMO_ACCOUNTS_LIST).find(([key]) => key === email);
        const demoAccountConfig = accountEntry ? accountEntry[1] : null;

        if (demoAccountConfig && demoAccountConfig.bankSlug && demoAccountConfig.role !== 'ADMIN_SAAS') {
          // If bank admin, force subdomain redirect
          window.location.href = `http://${demoAccountConfig.bankSlug}.lvh.me:5173/bank/dashboard`;
          return;
        }

        const redirectUrl = authService.getRedirectUrl(user);
        navigate(redirectUrl, { replace: true });

      } else {
        setError('Identifiants invalides. Utilisez l\'un des comptes de demonstration (mdp: admin123).');
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
                <MatchiaLogo variant="icon" showText={false} markClassName="login-logo-mark" />
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
                  type="email"
                  className="login-custom-input"
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-input-group">
                <Lock className="login-input-icon" />
                <input
                  type="password"
                  className="login-custom-input login-password-input"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Eye className="login-password-icon" />
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

            <Link to="/rejoindre" className="login-create-account">
              <UserRound className="login-create-icon" />
              Creer un compte
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
