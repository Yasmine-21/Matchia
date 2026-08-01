import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';

interface ProtectedRouteProps {
  requiredRole: 'saas' | 'bank';
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, isAuthenticated, isSaaSAdmin, isBankAdmin } = useApp();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === 'saas' && !isSaaSAdmin()) {
    return <Navigate to="/connexion" replace />;
  }

  if (requiredRole === 'bank' && !isBankAdmin() && !isSaaSAdmin()) {
    return <Navigate to="/connexion" replace />;
  }

  return <>{children}</>;
}
