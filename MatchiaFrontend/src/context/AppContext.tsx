import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, Bank } from '../types';

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
  canAccessBank: (bankId: string) => boolean;
  canAccessAllBanks: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// localStorage keys
const USER_STORAGE_KEY = 'matchia_user';
const BANK_STORAGE_KEY = 'matchia_bank';
const normalizeRole = (role?: string | null): User['role'] => {
  if (role === 'ADMIN_SAAS' || role === 'ADMIN_BANK' || role === 'CLIENT') {
    return role;
  }

  if (role === 'SUPER_ADMIN') {
    return 'ADMIN_SAAS';
  }

  if (role === 'ADMIN' || role === 'BANK_ADMIN' || role === 'MANAGER' || role === 'USER') {
    return 'ADMIN_BANK';
  }

  return (role ?? 'CLIENT') as User['role'];
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBank, setCurrentBankState] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedBank = localStorage.getItem(BANK_STORAGE_KEY);
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser({ ...parsedUser, role: normalizeRole(parsedUser.role) as User['role'] });
      }
      if (storedBank) {
        setCurrentBankState(JSON.parse(storedBank));
      }
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (user: User) => {
    const normalizedUser = { ...user, role: normalizeRole(user.role) as User['role'] };
    setCurrentUser(normalizedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentBankState(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(BANK_STORAGE_KEY);
    localStorage.removeItem('matchia_token');
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
