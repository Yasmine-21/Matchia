import { createBrowserRouter } from 'react-router';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { MarketplaceLayout } from './layouts/MarketplaceLayout';

// Imports Public
import { HomePage } from './pages/public/HomePage';
import { BanksPage } from './pages/public/BanksPage';
import { DealersPage } from './pages/public/DealersPage';
import { JoinPage } from './pages/public/JoinPage';
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { PaymentDemoPage } from './pages/public/PaymentDemoPage';
import { PaymentResultPage } from './pages/public/PaymentResultPage';
import { DealerRegistrationPage } from './pages/public/DealerRegistrationPage';

// Imports SaaS
import { SaaSDashboard } from './pages/saas/Dashboard';
import { SaaSBanks } from './pages/saas/Banks';
import { Requests } from './pages/saas/Requests';
import { Marketplaces } from './pages/saas/Marketplaces';
import { SaaSUsers } from './pages/saas/Users';
import { SaaSSettings } from './pages/saas/Settings';
import { AuditLogs } from './pages/saas/AuditLogs';
import { OffersAndSubscriptions } from './pages/saas/OffersAndSubscriptions';
import { Certificates } from './pages/saas/Certificates';
import { SaaSStoresModules } from './pages/saas/StoresModules';
import { ContentManagement } from './pages/saas/ContentManagementTabs';
import { ProfileSettingsPage } from './pages/shared/ProfileSettingsPage';
import { DealerRequests } from './pages/saas/DealerRequests';

// Imports Bank
import { BankDashboard } from './pages/bank/Dashboard';
import { BankUsers } from './pages/bank/Users';
import { BankStores } from './pages/bank/Stores';
import { BankModules } from './pages/bank/Modules';
import { BankBranding } from './pages/bank/Branding';
import { BankParameters } from './pages/bank/Parameters';
import { BankRequests } from './pages/bank/Requests';
import { BankSubscription } from './pages/bank/Subscription';
import { BankContentManagement } from './pages/bank/ContentManagement';
import { ProductManagement } from './pages/bank/ProductManagement';
import { DealerManagement } from './pages/bank/DealerManagement';
import { DealerWorkspace } from './pages/dealer/DealerWorkspace';
import { DealerSettingsPage } from './pages/dealer/DealerSettingsPage';

// Imports Marketplace
import { MarketplaceHome } from './pages/marketplace/Home';
import { MarketplaceStore } from './pages/marketplace/Store';
import { SimulatorModule } from './pages/marketplace/modules/Simulator';
import { ComparatorModule } from './pages/marketplace/modules/Comparator';
import { BlogModule } from './pages/marketplace/modules/Blog';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

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
      { path: 'concessionnaires', element: <DealersPage /> },
      { path: 'rejoindre', element: <JoinPage /> },
      { path: 'connexion', element: <LoginPage /> },
      { path: 'devenir-concessionnaire', element: <DealerRegistrationPage /> },
    ],
  },
  {
    path: '/mot-de-passe-oublie',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reinitialiser-mot-de-passe',
    element: <ResetPasswordPage />,
  },
  {
    path: '/payment/demo',
    element: <PaymentDemoPage />,
  },
  {
    path: '/paiement',
    element: <PaymentDemoPage />,
  },
  {
    path: '/payment-success',
    element: <PaymentResultPage status="success" />,
  },
  {
    path: '/payment-cancel',
    element: <PaymentResultPage status="cancel" />,
  },
  {
    path: '/payment/success',
    element: <PaymentResultPage status="success" />,
  },
  {
    path: '/payment/cancel',
    element: <PaymentResultPage status="cancel" />,
  },
  {
    path: '/saas',
    element: (
      <ProtectedRoute requiredRole="saas">
        <AdminLayout type="saas" />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <SaaSDashboard /> },
      { path: 'banques', element: <SaaSBanks /> },
      { path: 'demandes', element: <Requests /> },
      { path: 'gestion-contenu', element: <ContentManagement /> },
      { path: 'storesmodules', element: <SaaSStoresModules /> },
      { path: 'marketplaces', element: <Marketplaces /> },
      { path: 'certificates', element: <Certificates /> },
      { path: 'offers-subscriptions', element: <OffersAndSubscriptions /> },
      { path: 'utilisateurs', element: <SaaSUsers /> },
      { path: 'audit', element: <AuditLogs /> },
      { path: 'parametres', element: <SaaSSettings /> },
      { path: 'profil', element: <ProfileSettingsPage type="saas" /> },
      { path: 'concessionnaires', element: <DealerRequests /> },
    ],
  },
  {
    path: '/dealer',
    element: (
      <ProtectedRoute requiredRole="dealer">
        <AdminLayout type="dealer" />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DealerWorkspace mode="dashboard" /> },
      { path: 'partenariats', element: <DealerWorkspace mode="partnerships" /> },
      { path: 'contrats', element: <DealerWorkspace mode="contracts" /> },
      { path: 'produits', element: <DealerWorkspace mode="products" /> },
      { path: 'publications', element: <DealerWorkspace mode="publications" /> },
      { path: 'profil', element: <ProfileSettingsPage type="dealer" /> },
      { path: 'parametres', element: <DealerSettingsPage /> },
    ],
  },
]);

// ==========================================
// 2. ROUTEUR BANQUE (ex: bh.lvh.me:5173)
// ==========================================
export const tenantRouter = createBrowserRouter([
  {
    path: '/',
    element: <MarketplaceLayout />,
    children: [
      { index: true, element: <MarketplaceHome /> },
      { path: 'store/:storeSlug', element: <MarketplaceStore /> },
      { path: 'store/:storeSlug/simulator', element: <SimulatorModule /> },
      { path: 'store/:storeSlug/comparator', element: <ComparatorModule /> },
      { path: 'store/:storeSlug/blog', element: <BlogModule /> },
    ],
  },
  {
    path: '/connexion',
    element: <LoginPage />,
  },
  {
    path: '/rejoindre',
    element: <JoinPage />,
  },
  {
    path: '/inscription',
    element: <JoinPage />,
  },
  {
    path: '/mot-de-passe-oublie',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reinitialiser-mot-de-passe',
    element: <ResetPasswordPage />,
  },
  {
    path: '/bank',
    element: (
      <ProtectedRoute requiredRole="bank">
        <AdminLayout type="bank" />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <BankDashboard /> },
      { path: 'utilisateurs', element: <BankUsers /> },
      { path: 'stores', element: <BankStores /> },
      { path: 'modules', element: <BankModules /> },
      { path: 'products', element: <ProductManagement /> },
      { path: 'gestion-contenu', element: <BankContentManagement /> },
      { path: 'branding', element: <BankBranding /> },
      { path: 'demandes', element: <BankRequests /> },
      { path: 'abonnement', element: <BankSubscription /> },
      { path: 'parametres', element: <BankParameters /> },
      { path: 'profil', element: <ProfileSettingsPage type="bank" /> },
      { path: 'concessionnaires', element: <DealerManagement /> },
    ],
  },
]);
