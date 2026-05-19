import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Store,
  Box,
  Users,
  Settings,
  ChevronLeft,
  Bell,
  LogOut,
  ExternalLink,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  type: 'saas' | 'bank';
}

export function AdminSidebar({ type }: AdminSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Le const bankSlug a été supprimé ici car nous n'en avons plus besoin pour le lien

  const saasSections: SidebarSection[] = [
    {
      title: 'GÉNÉRAL',
      items: [
        { label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, path: '/saas/dashboard' },
      ],
    },
    {
      title: 'GESTION',
      items: [
        { label: 'Banques', icon: <Building2 className="w-5 h-5" />, path: '/saas/banques' },
        { label: 'Demandes', icon: <FileText className="w-5 h-5" />, path: '/saas/demandes' },
        { label: 'Stores & Modules', icon: <Store className="w-5 h-5" />, path: '/saas/storesmodules' },
        { label: 'Utilisateurs & Rôles', icon: <Users className="w-5 h-5" />, path: '/saas/utilisateurs' },
      ],
    },
    {
      title: 'PLATEFORME',
      items: [
        { label: 'Marketplace', icon: <Store className="w-5 h-5" />, path: '/saas/marketplaces' },
        { label: 'Sécurité et Certificats', icon: <ShieldCheck className="w-5 h-5" />, path: '/saas/certificates' },
        { label: 'Offres et Abonnements', icon: <CreditCard className="w-5 h-5" />, path: '/saas/offers-subscriptions' },
      ],
    },
    {
      title: 'ANALYSE',
      items: [
        { label: 'Audit & Logs', icon: <FileText className="w-5 h-5" />, path: '/saas/audit' },
      ],
    },
    {
      title: 'SYSTÈME',
      items: [
        { label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/saas/parametres' },
      ],
    },
  ];

  const bankItems: SidebarItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/bank/dashboard' },
    { label: 'Users', icon: <Users className="w-5 h-5" />, path: '/bank/utilisateurs' },
    { label: 'Assigned Stores', icon: <Store className="w-5 h-5" />, path: '/bank/stores' },
    { label: 'Assigned Modules', icon: <Box className="w-5 h-5" />, path: '/bank/modules' },
    { label: 'Personalization', icon: <Settings className="w-5 h-5" />, path: '/bank/branding' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/bank/parametres' },
  ];

  const sections = type === 'saas' ? saasSections : [{ title: '', items: bankItems }];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <div>
              <div className="font-semibold text-sidebar-foreground">Matchia</div>
              <div className="text-xs text-muted-foreground">
                {type === 'saas' ? 'SaaS Admin' : 'Banque Admin'}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title || 'bank'} className="mb-4">
            {!collapsed && section.title && (
              <div className="text-xs font-semibold text-gray-400 mt-6 mb-2 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path || '#'}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-orange-50 text-orange-500 border-l-4 border-orange-500'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      {item.icon}
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {type === 'bank' && (
          /* CORRECTION INTEGREE : On pointe vers "/" */
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            <ExternalLink className="w-5 h-5" />
            {!collapsed && <span className="text-sm">View Marketplace</span>}
          </a>
        )}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
          <Bell className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Notifications</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}