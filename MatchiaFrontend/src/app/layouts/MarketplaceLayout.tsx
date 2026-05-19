import { Outlet, Link } from 'react-router';
import { getBankWithStores } from '../data/mockData';
import { Store, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';

// Utilitaire pour détecter le sous-domaine (ignore les adresses IP et localhost)
const getSubdomain = () => {
  const hostname = window.location.hostname;
  
  if (/^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== 'www') return subdomain;
  }
  return null;
};

export function MarketplaceLayout() {
  const bankSlug = getSubdomain();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Sécurité au cas où la fonction ne trouve pas de sous-domaine
  if (!bankSlug) return <div className="p-8 text-center text-red-500">Erreur : Aucun identifiant de banque trouvé.</div>;

  const bankData = getBankWithStores(bankSlug === 'zitouna' ? '1' : '2');

  if (!bankData) {
    return <div className="p-8 text-center">Banque non trouvée</div>;
  }

  const { branding, stores } = bankData;

  return (
    <div className="min-h-screen flex flex-col" style={{ '--bank-primary': branding.primary_color, '--bank-secondary': branding.secondary_color } as any}>
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* CORRECTION 1 : Le lien pointe vers /marketplace au lieu de / */}
            <Link to="/" className="flex items-center gap-3">
              <img src={branding.logo_image_url} alt={bankData.name} className="h-10 w-10 object-cover rounded-lg" />
              <span className="text-xl font-bold" style={{ color: branding.primary_color }}>{bankData.name}</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {stores.map((store) => (
                
                <Link
                  key={store.id}
                  to={`/store/${store.name}`}
                  className="text-foreground hover:opacity-80 transition-opacity"
                  style={{ color: branding.primary_color }}
                >
                  {store.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/connexion">
                <Button size="sm" variant="outline" icon={<User className="w-4 h-4" />}>
                  Se connecter
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white px-4 py-4">
            <nav className="space-y-2">
              {stores.map((store) => (
                /* CORRECTION 3 : Ajout du préfixe /marketplace pour le menu mobile */
                <Link
                  key={store.id}
                  to={`/store/${store.name}`}
                  className="block py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {store.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ bankData, branding }} />
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-slate-400">{branding.footer_text}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}