export type BankStatus = 'pending' | 'active' | 'suspended';
export type StoreStatus = 'active' | 'inactive';
export type ModuleStatus = 'active' | 'inactive';
export type RequestType = 'join' | 'store' | 'module';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

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
  price?: number | null;
  createdAt?: string;
}
export interface ModuleDto {
  id: number;
  label: string;    
  name: string;   
  description: string;  
  status: ModuleStatus;
  icon: string | null;
  category?: string | null;
  price?: number | null;
  createdAt: string;

}
export interface ModuleParameter {
  id: number;
  name: string;
  code: string;
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
    description?: string | null;
    icon: string | null;
    category: string | null;
    status: string;
    price?: number | null;
    createdAt: string;
  };
  parameters: ModuleParameter[];
  actif: boolean;
  ordre: number;
}

export interface RequestDto {
  id?: number;
  bankId?: number | null;
  requestType: RequestType;
  status: RequestStatus;
  priority?: string | null;
  createdBy?: string | null;
  bankName: string;
  bankEmail: string;
  logoUrl?: string | null;
  country: string;
  website?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description?: string | null;
  selectedStores?: string | null;
  selectedModules?: string | null;
  storeIds: number[];
  moduleIds: number[];
  totalAmount: number;
  createdAt?: string;
}

export interface RequestPayload {
  bankName: string;
  bankEmail: string;
  country: string;
  website?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description?: string;
  storeIds: number[];
  moduleIds: number[];
  totalAmount: number;
  logo?: File | null;
}
