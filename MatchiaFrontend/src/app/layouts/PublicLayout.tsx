import { Outlet, useLocation } from 'react-router';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';

export function PublicLayout() {
  const location = useLocation();
  const hideHeaderFooter = location.pathname === '/connexion';

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeaderFooter && <PublicHeader />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideHeaderFooter && <PublicFooter />}
    </div>
  );
}
