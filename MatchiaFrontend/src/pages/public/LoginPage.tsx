import '../../styles/LoginPage.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, Lock, Mail, UserRound } from 'lucide-react';
import { MatchiaLogo } from '../../components/brand/MatchiaLogo';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';

const DEMO_ACCOUNTS_LIST = {
  'admin@matchia.com': { role: 'SUPER_ADMIN', name: 'Mariem Trabelsi' },
  'ahmed@zitouna.com': { role: 'SUPER_ADMIN', name: 'Ahmed Ben Ali', bankSlug: 'zitouna' },
  'fatma@bhbank.com': { role: 'BANK_ADMIN', name: 'Fatma Gharbi', bankSlug: 'bh' },
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);

      if (user) {
        login(user);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Find if this account is associated with a bank
        const accountEntry = Object.entries(DEMO_ACCOUNTS_LIST).find(([key]) => key === email);
        const demoAccountConfig = accountEntry ? accountEntry[1] : null;

        if (demoAccountConfig && demoAccountConfig.bankSlug && demoAccountConfig.role !== 'SUPER_ADMIN') {
          // If BANK_ADMIN, force subdomain redirect
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
    <div className="login-page-body">
      <div className="login-background-orb login-background-orb-top" />
      <div className="login-background-orb login-background-orb-bottom" />
      <div className="login-dot-grid login-dot-grid-left" />
      <div className="login-dot-grid login-dot-grid-right" />
      <div className="login-dot-grid login-dot-grid-bottom" />

      <div className="login-split-wrapper">
        <div className="login-split-right">
          <div className="login-form-wrapper">
            <div className="login-logo-wrap">
              <MatchiaLogo variant="icon" showText={false} markClassName="login-logo-mark" />
            </div>

            <h2 className="login-form-title">Connexion</h2>
            <p className="login-form-subtitle">
              Saisissez vos identifiants pour acceder a la plateforme.
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

            <Link to="/inscription" className="login-create-account">
              <UserRound className="login-create-icon" />
              Creer un compte
            </Link>

            <div className="login-demo-panel">
              <div className="login-demo-title">
                Comptes de demonstration
              </div>
              {Object.entries(DEMO_ACCOUNTS_LIST).map(([demoEmail, config]) => (
                <div 
                  key={demoEmail} 
                  className="login-demo-item"
                  onClick={() => {
                    setEmail(demoEmail);
                    setPassword('admin123');
                  }}
                  title="Cliquez pour utiliser ce compte"
                >
                  <div className="login-demo-user">
                    <UserRound className="login-demo-icon" />
                    <span className="login-demo-email">{demoEmail}</span>
                  </div>
                  <span className="login-demo-badge">
                    {config.role === 'SUPER_ADMIN' ? 'SaaS' : 'Banque'}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
