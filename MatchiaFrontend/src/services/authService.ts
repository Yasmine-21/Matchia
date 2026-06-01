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

export const authService = {
  /**
   * Authenticate with the backend
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      // Save JWT token
      localStorage.setItem('matchia_token', data.token);

      // Construct user object
      const user: User = {
        id: `user-${data.email}`,
        name: data.name || data.email,
        email: data.email,
        role: data.role as any,
        bank_id: data.bankSlug === 'zitouna' ? '1' : (data.bankSlug === 'bh' ? '2' : undefined),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  /**
   * Get redirect URL based on user role
   */
  getRedirectUrl(user: User): string {
    if (user.role === 'SUPER_ADMIN') {
      return '/saas/dashboard';
    }
    
    if (user.role === 'ADMIN' || user.role === 'BANK_ADMIN' as any) {
      return `/bank/dashboard`;
    }

    return '/'; // Fallback
  },

  logout() {
    localStorage.removeItem('matchia_token');
  }
};
