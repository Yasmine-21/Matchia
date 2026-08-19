import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';

interface ProtectedRouteProps {
  requiredRole: 'saas' | 'bank' | 'dealer' | 'client';
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, isAuthenticated, isSaaSAdmin, isBankAdmin, isDealerAdmin, currentUser } = useApp();

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

  if (requiredRole === 'dealer' && !isDealerAdmin()) {
    return <Navigate to="/connexion" replace />;
  }

  if (requiredRole === 'client' && currentUser?.role !== 'CLIENT') {
    return <Navigate to="/connexion" replace />;
  }

  return <>{children}</>;
}
