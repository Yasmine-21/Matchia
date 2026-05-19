export type BankStatus = 'pending' | 'active' | 'suspended';
export type StoreStatus = 'active' | 'inactive';
export type ModuleStatus = 'active' | 'inactive';

export interface Bank {
  id: number;
  name: string;
  slug: string;
  logoUrl: string;
  country: string;
  description: string;
  establishedYear: number;
  status: BankStatus;
  totalUsers: number;
}
export interface StoreDto {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: StoreStatus;
  createdAt?: string;
}
export interface ModuleDto {
  id: number;
  label: string;    
  name: string;     
  status: ModuleStatus;
  icon: string | null;
  category?: string | null;
  createdAt: string;

}
export interface ModuleParameter {
  id: number;
  code: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  value?: string | number | boolean | null;
  options?: string[]; // Pour les champs de type select
}

export interface ModuleAssignment {
  id: number;
  module: {
    id: number;
    name: string;
    label?: string;
    icon: string | null;
    category: string | null;
    status: string;
    createdAt: string;
  };
  parameters: ModuleParameter[];
  actif: boolean;
  ordre: number;
}