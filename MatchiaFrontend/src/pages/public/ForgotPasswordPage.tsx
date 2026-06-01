import '../../styles/LoginPage.css';
import { useState } from 'react';
import { Link } from 'react-router';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email) {
      setSuccess(true);
      setLoading(false);
    } else {
      setError('Veuillez entrer une adresse e-mail valide.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page-body">
      <div className="login-split-wrapper">
        <div className="login-split-right">
          <div className="login-form-wrapper">
            
            <h2 className="login-form-title">Mot de passe oublié</h2>
            <p className="login-form-subtitle">
              Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation de votre mot de passe.
            </p>

            {success ? (
              <div className="text-center">
                <div className="p-4 mb-6 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                  Un e-mail de réinitialisation a été envoyé à <strong>{email}</strong>.
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

                <div className="text-center mb-6 mt-4">
                  <Link to="/connexion" className="text-slate-500 hover:text-[#2563eb] transition-colors text-xs">
                    Retourner à la connexion
                  </Link>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'ENVOI EN COURS...' : 'RÉINITIALISER'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
