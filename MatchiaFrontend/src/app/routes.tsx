import { createBrowserRouter, Navigate } from 'react-router';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { MarketplaceLayout } from './layouts/MarketplaceLayout';

// Imports Public
import { HomePage } from './pages/public/HomePage';
import { BanksPage } from './pages/public/BanksPage';
import { JoinPage } from './pages/public/JoinPage';
import { LoginPage } from './pages/public/LoginPage';

// Imports SaaS
import { SaaSDashboard } from './pages/saas/Dashboard';
import { SaaSBanks } from './pages/saas/Banks';
import { SaaSRequests } from './pages/saas/Requests';
import { Marketplaces } from './pages/saas/Marketplaces';
import { SaaSUsers } from './pages/saas/Users';
import { SaaSSettings } from './pages/saas/Settings';
import { AuditLogs } from './pages/saas/AuditLogs';
import { OffersAndSubscriptions } from './pages/saas/OffersAndSubscriptions';
import { Certificates } from './pages/saas/Certificates';
import{SaaSStoresModules} from './pages/saas/StoresModules';


// Imports Bank
import { BankDashboard } from './pages/bank/Dashboard';
import { BankUsers } from './pages/bank/Users';
import { BankStores } from './pages/bank/Stores';
import { BankModules } from './pages/bank/Modules';
import { BankBranding } from './pages/bank/Branding';
import { BankRequests } from './pages/bank/Requests';

// Imports Marketplace
import { MarketplaceHome } from './pages/marketplace/Home';
import { MarketplaceStore } from './pages/marketplace/Store';
import { SimulatorModule } from './pages/marketplace/modules/Simulator';
import { ComparatorModule } from './pages/marketplace/modules/Comparator';
import { BlogModule } from './pages/marketplace/modules/Blog';

// ==========================================
// 1. ROUTEUR PRINCIPAL (lvh.me:5173)
// ==========================================
export const saasRouter = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'banques', element: <BanksPage /> },
      { path: 'rejoindre', element: <JoinPage /> },
      { path: 'connexion', element: <LoginPage /> },
    ],
  },
  {
    // Accès: http://lvh.me:5173/saas
    path: '/saas',
    element: <AdminLayout type="saas" />,
    children: [
      { path: 'dashboard', element: <SaaSDashboard /> },
      { path: 'banques', element: <SaaSBanks /> },
      { path: 'demandes', element: <SaaSRequests /> },
      { path: 'storesmodules', element: <SaaSStoresModules /> },
      { path: 'marketplaces', element: <Marketplaces /> },
      { path: 'certificates', element: <Certificates /> },
      { path: 'offers-subscriptions', element: <OffersAndSubscriptions /> },
      { path: 'utilisateurs', element: <SaaSUsers /> },
      { path: 'audit', element: <AuditLogs /> },
  
      { path: 'parametres', element: <SaaSSettings /> },
    ],
  }
]);

// ==========================================
// 2. ROUTEUR BANQUE (ex: bh.lvh.me:5173)
// ==========================================
export const tenantRouter = createBrowserRouter([
  {
    // On met le layout directement sur la racine "/"
    path: '/',
    element: <MarketplaceLayout />,
    children: [
      // MarketplaceHome s'affichera sur bh.lvh.me:5173/
      { index: true, element: <MarketplaceHome /> }, 
      { path: 'store/:storeSlug', element: <MarketplaceStore /> },
      { path: 'store/:storeSlug/simulator', element: <SimulatorModule /> },
      { path: 'store/:storeSlug/comparator', element: <ComparatorModule /> },
      { path: 'store/:storeSlug/blog', element: <BlogModule /> },
    ],
  },
  {
    // Accès: http://bh.lvh.me:5173/bank/dashboard
    path: '/bank',
    element: <AdminLayout type="bank" />,
    children: [
      { path: 'dashboard', element: <BankDashboard /> },
      { path: 'utilisateurs', element: <BankUsers /> },
      { path: 'stores', element: <BankStores /> },
      { path: 'modules', element: <BankModules /> },
      { path: 'branding', element: <BankBranding /> },
      { path: 'demandes', element: <BankRequests /> },
      { path: 'parametres', element: <div className="p-6">Paramètres Banque</div> },
    ],
  },
]);