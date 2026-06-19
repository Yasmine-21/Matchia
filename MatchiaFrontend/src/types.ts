// Types for Matchia SaaS Platform

export interface Bank {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  country: string;
  description: string;
  website_url: string;
  established_year: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'rejected';
  total_users: number;
  rating: number;
  created_at: string;
  updated_at: string;
  email?: string | null;
  logoUrl: string;
  websiteUrl: string;
  establishedYear: number;
  establishmentYear: number;
  totalUsers: number;
  assignedStoresCount?: number | null;
  createdAt?: string;
}

export interface BankBranding {
  id: string;
  bank_id: string;
  primary_color: string;
  secondary_color: string;
  homepage_title: string;
  welcome_text: string;
  banner_image_url: string;
  footer_text: string;
  logo_image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  label: string;
  icon: string;
  status: 'active' | 'inactive';
  usage_count: number;
  created_at: string;
}

export interface Module {
  id: string;
  name: string;
  label: string;
  status: 'active' | 'inactive';
  usage_count: number;
  created_at: string;
}

export interface BankStore {
  id: string;
  bank_id: string;
  store_id: string;
  enabled: boolean;
  visible: boolean;
  created_at: string;
}

export interface BankStoreModule {
  id: string;
  bank_store_id: string;
  module_id: string;
  enabled: boolean;
  visible: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN_SAAS' | 'ADMIN_BANK' | 'CLIENT';
  bank_id?: string; // null for ADMIN_SAAS
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Request {
  id: string;
  request_type: 'join' | 'store' | 'module' | 'subscription';
  bank_id?: string;
  store_id?: string;
  module_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  created_by: string;
  approved_by?: string;
  created_at: string;
  notes?: string;
}

export interface StoreWithModules extends Store {
  modules: Module[];
}

export interface BankWithStores extends Bank {
  stores: Array<Store & { modules: Module[] }>;
  branding: BankBranding;
}
