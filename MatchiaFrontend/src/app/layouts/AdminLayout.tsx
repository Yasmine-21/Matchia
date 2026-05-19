import { Outlet } from 'react-router';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Bell, Search, User } from 'lucide-react';

interface AdminLayoutProps {
  type: 'saas' | 'bank';
}

export function AdminLayout({ type }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar type={type} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <button className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">Admin</div>
                <div className="text-xs text-muted-foreground">
                  {type === 'saas' ? 'Super Admin' : 'Bank Admin'}
                </div>
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto w-full px-18 py-10 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
