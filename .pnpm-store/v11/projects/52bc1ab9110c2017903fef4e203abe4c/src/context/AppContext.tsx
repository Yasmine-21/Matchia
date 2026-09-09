import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, Bank } from '../types';
import { BANK_STORAGE_KEY, USER_STORAGE_KEY, clearStoredSession } from '../services/sessionStorage';
import { authService } from '../services/authService';

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  currentBank: Bank | null;
  login: (user: User) => void;
  logout: () => void;
  setCurrentBank: (bank: Bank | null) => void;
  isLoading: boolean;
  // Multi-tenant helpers
  isSaaSAdmin: () => boolean;
  isBankAdmin: () => boolean;
  isDealerAdmin: () => boolean;
  canAccessBank: (bankId: string) => boolean;
  canAccessAllBanks: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const normalizeRole = (role?: string | null): User['role'] => {
  if (role === 'ADMIN_SAAS' || role === 'SAAS_ADMIN' || role === 'SUPER_ADMIN') {
    return 'ADMIN_SAAS';
  }

  if (role === 'ADMIN_BANK' || role === 'BANK_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'USER') {
    return 'ADMIN_BANK';
  }

  if (role === 'CLIENT') {
    return role;
  }

  if (role === 'DEALER_ADMIN') return 'DEALER_ADMIN';

  return 'CLIENT';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBank, setCurrentBankState] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
      const storedBank = localStorage.getItem(BANK_STORAGE_KEY);

        if (storedBank && mounted) {
          setCurrentBankState(JSON.parse(storedBank));
        }

        let backendUser: User | null = null;

        backendUser = await authService.getCurrentUser();
        if (!backendUser) {
          backendUser = await authService.restoreSession();
        }

        if (backendUser && mounted) {
          setCurrentUser({ ...backendUser, role: normalizeRole(backendUser.role) as User['role'] });
        }
      } catch (error) {
        console.error('Error loading session from backend:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionCleared = () => {
      setCurrentUser(null);
      setCurrentBankState(null);
    };

    window.addEventListener('matchia-auth-cleared', handleSessionCleared);
    return () => window.removeEventListener('matchia-auth-cleared', handleSessionCleared);
  }, []);

  const login = (user: User) => {
    const normalizedUser = { ...user, role: normalizeRole(user.role) as User['role'] };
    setCurrentUser(normalizedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentBankState(null);
    clearStoredSession();
  };

  const setCurrentBank = (bank: Bank | null) => {
    setCurrentBankState(bank);
    if (bank) {
      localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(bank));
    } else {
      localStorage.removeItem(BANK_STORAGE_KEY);
    }
  };

  // Multi-tenant access control
  const isSaaSAdmin = () => normalizeRole(currentUser?.role) === 'ADMIN_SAAS';
  
  const isBankAdmin = () => 
    normalizeRole(currentUser?.role) === 'ADMIN_BANK';

  const isDealerAdmin = () => normalizeRole(currentUser?.role) === 'DEALER_ADMIN';
  
  const canAccessBank = (bankId: string): boolean => {
    if (!currentUser) return false;
    if (normalizeRole(currentUser.role) === 'ADMIN_SAAS') return true;
    return currentUser.bank_id === bankId;
  };
  
  const canAccessAllBanks = (): boolean => {
    return normalizeRole(currentUser?.role) === 'ADMIN_SAAS';
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        currentBank,
        login,
        logout,
        setCurrentBank,
        isLoading,
        isSaaSAdmin,
        isBankAdmin,
        isDealerAdmin,
        canAccessBank,
        canAccessAllBanks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
