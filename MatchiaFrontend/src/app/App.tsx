import { RouterProvider } from 'react-router';
import { saasRouter, tenantRouter } from './routes';
import { AppProvider } from './context/AppContext';
import { SessionLoader } from './components/SessionLoader';

// Utilitaire pour détecter le sous-domaine (ignore les adresses IP et localhost)
const getSubdomain = () => {
  const hostname = window.location.hostname;

  // 1. Si c'est une adresse IP (ex: 192.168.100.15) ou localhost, on force le retour à null
  if (/^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
    return null;
  }

  // 2. Sinon, on cherche un sous-domaine
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== 'www') return subdomain;
  }
  return null;
};

export default function App() {
  const subdomain = getSubdomain();

  // Si un sous-domaine est présent, on utilise le routeur Marketplace
  // Sinon, on utilise le routeur SaaS/Public/Admin
  const activeRouter = subdomain ? tenantRouter : saasRouter;

  return (
    <AppProvider>
      <SessionLoader>
        <RouterProvider router={activeRouter} />
      </SessionLoader>
    </AppProvider>
  );
}