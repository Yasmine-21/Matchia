import '../../styles/LoginPage.css';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Lock } from 'lucide-react';
import { authService } from '../../services/authService';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isTokenMissing = useMemo(() => !token.trim(), [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isTokenMissing) {
      setError('Le lien de réinitialisation est invalide ou expiré.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.trim().length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-body">
      <div className="login-split-wrapper">
        <div className="login-split-right">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">Réinitialiser le mot de passe</h2>
            <p className="login-form-subtitle">
              Choisissez un nouveau mot de passe sécurisé pour accéder à votre espace.
            </p>

            {success ? (
              <div className="text-center">
                <div className="p-4 mb-6 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                  Votre mot de passe a été réinitialisé avec succès.
                </div>
                <Link to="/connexion">
                  <button className="login-submit-btn" style={{ backgroundColor: '#1e293b' }}>
                    RETOUR À LA CONNEXION
                  </button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <div className="login-input-group">
                  <Lock className="login-input-icon" />
                  <input
                    type="password"
                    className="login-custom-input"
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="login-input-group">
                  <Lock className="login-input-icon" />
                  <input
                    type="password"
                    className="login-custom-input"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="text-center mb-6 mt-4">
                  <Link to="/connexion" className="text-slate-500 hover:text-[#2563eb] transition-colors text-xs">
                    Retourner à la connexion
                  </Link>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading || isTokenMissing}
                >
                  {loading ? 'MISE À JOUR EN COURS...' : 'RÉINITIALISER'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
