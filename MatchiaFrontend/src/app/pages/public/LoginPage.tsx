import '../../../styles/LoginPage.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { authService, DEMO_ACCOUNTS } from '../../services/authService';

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

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Try demo account authentication
      const user = authService.authenticateDemo(email, password);

      if (user) {
        // Login successful
        login(user);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // CORRECTION ICI : On cherche la configuration du compte démo basé sur l'email
        // Cela nous garantit de trouver le bon bankSlug, même s'il n'est pas dans l'objet 'user'
        const accountEntry = Object.entries(DEMO_ACCOUNTS).find(([key]) => key === email);
        const demoAccountConfig = accountEntry ? accountEntry[1] : null;

        if (demoAccountConfig && demoAccountConfig.bankSlug) {
          // Si c'est un Bank Admin (il a un bankSlug), on FORCE la redirection vers le sous-domaine
          window.location.href = `http://${demoAccountConfig.bankSlug}.lvh.me:5173/bank/dashboard`;
          return; // IMPORTANT : On arrête la fonction ici pour ne pas exécuter le navigate() en dessous
        }

        // Si ce n'est pas un admin de banque (ex: admin@matchia.com), on reste sur lvh.me
        const redirectUrl = authService.getRedirectUrl(user);
        navigate(redirectUrl, { replace: true });

      } else {
        // Not a demo account - show error
        setError('Email ou identifiants invalides. Utilisez l\'un des comptes de démonstration.');
        setLoading(false);
      }
    } catch (err) {
      setError('Une erreur s\'est produite lors de la connexion.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-wrapper"
      >
        <div className="login-header">
          <Link to="/" className="login-logo-link">
            <div className="login-logo-icon">
              <span className="login-logo-letter">M</span>
            </div>
            <span className="login-logo-text">Matchia</span>
          </Link>
          <h1 className="login-title">Connexion</h1>
          <p className="login-subtitle">
            Accédez à votre espace Matchia
          </p>
        </div>

        <Card>
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Identifiants</CardTitle>
              <CardDescription>
                Utilisez vos identifiants pour accéder à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="login-form-spacing">
              {error && (
                <div className="login-error-alert">
                  <AlertCircle className="login-error-icon" />
                  <p className="login-error-text">{error}</p>
                </div>
              )}
              <Input
                type="email"
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="login-icon" />}
                required
                disabled={loading}
              />
              <Input
                type="password"
                label="Mot de passe"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="login-icon" />}
                required
                disabled={loading}
              />
              <Link to="/mot-de-passe-oublie" className="login-forgot-link">
                Mot de passe oublié ?
              </Link>
            </CardContent>
            <CardFooter className="login-actions">
              <Button
                type="submit"
                className="login-submit-btn"
                loading={loading}
                disabled={loading}
                icon={<ArrowRight className="login-icon" />}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
              <p className="login-register-text">
                Pas encore de compte ?{' '}
                <Link to="/inscription" className="login-register-link">
                  Créer un compte
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Accounts Help Section */}
        <div className="login-demo-container">
          <p className="login-demo-title"> Comptes de démonstration :</p>
          <div className="login-demo-list">
            {Object.entries(DEMO_ACCOUNTS).map(([demoEmail, config]) => (
              <div key={demoEmail} className="login-demo-item">
                <div className="login-demo-email">{demoEmail}</div>
                <div className="login-demo-role">
                  • {config.role === 'SUPER_ADMIN' ? 'SaaS Platform Admin' : 'Bank Admin'}
                  {config.bankSlug && ` (${config.bankSlug})`}
                  <br />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}