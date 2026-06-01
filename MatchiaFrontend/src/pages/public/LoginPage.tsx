import '../../styles/LoginPage.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
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
        setError('Identifiants invalides. Utilisez l\'un des comptes de démonstration (mdp: admin123).');
        setLoading(false);
      }
    } catch (err) {
      setError('Une erreur s\'est produite lors de la connexion.');
      setLoading(false);
    }
  };

  const [showDemoPanel, setShowDemoPanel] = useState(false);

  return (
    <div className="login-page-body">
      <div className="login-split-wrapper">
        
        {/* Centered Form */}
        <div className="login-split-right">
          <div className="login-form-wrapper">
            
            <h2 className="login-form-title">Connexion</h2>
            <p className="login-form-subtitle">
              Saisissez vos identifiants pour accéder à la plateforme. En cas de problème de connexion, veuillez contacter le support administrateur.
            </p>

            <form onSubmit={handleLogin}>
              {error && (
                <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <div className="login-input-group">
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
                <input
                  type="password"
                  className="login-custom-input"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-form-options">
                <Link to="/mot-de-passe-oublie" className="text-slate-500 hover:text-[#2563eb] transition-colors">
                  Mot de passe oublié ?
                </Link>
                <Link to="/inscription" className="login-link-alt">
                  Créer un compte
                </Link>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? 'CONNEXION EN COURS...' : 'CONNEXION'}
              </button>
            </form>

            {/* Demo Accounts Panel */}
            <div className="login-demo-panel">
              <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
                Comptes de démonstration
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
                  <span className="font-mono text-[11px]">{demoEmail}</span>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
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