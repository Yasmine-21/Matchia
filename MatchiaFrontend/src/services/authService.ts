import type { User } from '../types';

/**
 * Demo Account Configuration
 * Maps demo emails to their roles and associated banks
 */
export const DEMO_ACCOUNTS = {
  'admin@matchia.com': {
    name: 'Mariem Trabelsi',
    role: 'ADMIN_SAAS',
    bank_id: undefined,
    bankSlug: undefined,
  },
  'ahmed@zitouna.com': {
    name: 'Ahmed Ben Ali',
    role: 'ADMIN_BANK',
    bank_id: '1',
    bankSlug: 'zitouna',
  },
  'fatma@bhbank.com': {
    name: 'Fatma Gharbi',
    role: 'ADMIN_BANK',
    bank_id: '2',
    bankSlug: 'bh',
  },
};

const normalizeRole = (role?: string | null): User['role'] => {
  if (role === 'ADMIN_SAAS' || role === 'ADMIN_BANK' || role === 'CLIENT') {
    return role;
  }
  if (role === 'SUPER_ADMIN') return 'ADMIN_SAAS';
  if (role === 'ADMIN' || role === 'BANK_ADMIN' || role === 'MANAGER' || role === 'USER') return 'ADMIN_BANK';
  return 'CLIENT';
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
        role: normalizeRole(data.role) as User['role'],
        bank_id: data.bankId || (data.bankSlug === 'zitouna' ? '1' : (data.bankSlug === 'bh' ? '2' : undefined)),
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
    if (user.role === 'ADMIN_SAAS') {
      return '/saas/dashboard';
    }
    
    if (user.role === 'ADMIN_BANK') {
      return `/bank/dashboard`;
    }

    return '/'; // Fallback
  },

  logout() {
    localStorage.removeItem('matchia_token');
    localStorage.removeItem('matchia_user');
    localStorage.removeItem('matchia_bank');
  }
};
