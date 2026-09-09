import { RouterProvider } from 'react-router';
import { saasRouter, tenantRouter } from './routes';
import { AppProvider } from './context/AppContext';
import { SessionLoader } from './components/SessionLoader';
import { Toaster } from './components/ui/sonner';
import { AppAlertProvider } from './components/ui/AppAlertProvider';
import { getTenantSlugFromLocation } from './utils/tenant';

export default function App() {
  const subdomain = getTenantSlugFromLocation();

  // Si un sous-domaine est présent, on utilise le routeur Marketplace
  // Sinon, on utilise le routeur SaaS/Public/Admin
  const activeRouter = subdomain ? tenantRouter : saasRouter;

  return (
    <AppProvider>
      <AppAlertProvider>
        <SessionLoader>
          <RouterProvider router={activeRouter} />
          <Toaster />
        </SessionLoader>
      </AppAlertProvider>
    </AppProvider>
  );
}
