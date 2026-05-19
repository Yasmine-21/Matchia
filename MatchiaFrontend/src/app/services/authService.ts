import type { User, Bank } from '../types';
import { banks } from '../data/mockData';

/**
 * Demo Account Configuration
 * Maps demo emails to their roles and associated banks
 */
export const DEMO_ACCOUNTS = {
  'admin@matchia.com': {
    name: 'Mariem Trabelsi',
    role: 'SUPER_ADMIN',
    bank_id: undefined,
    bankSlug: undefined,
  },
  'ahmed@zitouna.com': {
    name: 'Ahmed Ben Ali',
    role: 'ADMIN',
    bank_id: '1',
    bankSlug: 'zitouna',
  },
  'fatma@bhbank.com': {
    name: 'Fatma Gharbi',
    role: 'ADMIN',
    bank_id: '2',
    bankSlug: 'bh',
  },
};

/**
 * Demo Authentication Service
 * Handles authentication for demo accounts with any password
 */
export const authService = {
  /**
   * Authenticate a demo account
   * Demo accounts bypass password validation
   */
  authenticateDemo(email: string, password: string): User | null {
    const demoAccount = DEMO_ACCOUNTS[email as keyof typeof DEMO_ACCOUNTS];
    
    if (!demoAccount) {
      return null;
    }

    // Demo accounts accept ANY password
    const user: User = {
      id: `demo-${email}`,
      name: demoAccount.name,
      email,
      role: demoAccount.role as any,
      bank_id: demoAccount.bank_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return user;
  },

  /**
   * Get redirect URL based on user role
   */
  getRedirectUrl(user: User): string {
    if (user.role === 'SUPER_ADMIN') {
      return '/saas/dashboard';
    }
    
    // For ADMIN or MANAGER, redirect to bank dashboard
    const demoAccount = DEMO_ACCOUNTS[user.email as keyof typeof DEMO_ACCOUNTS];
    if (demoAccount?.bankSlug) {
      return `/bank/dashboard`; // Using generic /bank path since routes are simplified
    }

    return '/'; // Fallback
  },

  /**
   * Check if an email is a demo account
   */
  isDemoAccount(email: string): boolean {
    return email in DEMO_ACCOUNTS;
  },

  /**
   * Get demo account info
   */
  getDemoAccountInfo(email: string) {
    return DEMO_ACCOUNTS[email as keyof typeof DEMO_ACCOUNTS];
  },
};
