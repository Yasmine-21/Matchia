export type BankStatus = 'pending' | 'inactive' | 'active' | 'suspended' | 'rejected';
export type StoreStatus = 'active' | 'inactive';
export type ModuleStatus = 'active' | 'inactive';
export type RequestType = 'join' | 'store' | 'module';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type NotificationStatus = 'UNREAD' | 'READ';
export type NotificationType = 'JOIN_REQUEST';

export interface Bank {
  id: number;
  name: string;
  slug: string;
  email?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  establishedYear?: number | null;
  establishmentYear?: number | null;
  status: BankStatus;
  totalUsers?: number | null;
  assignedStoresCount?: number | null;
  createdAt?: string;
}
export interface StoreDto {
  id: number;
  name: string;
  description: string;
  icon: string;
  banniereUrl?: string | null;
  status: StoreStatus;
  price?: number | null;
  createdAt?: string;
  modulesCount?: number;
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
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'image';
  required: boolean;
  value?: string | number | boolean | null;
  options?: string[]; // Pour les champs de type select
}

export interface ModuleAssignment {
  id: number;
  price?: number | null;
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

export interface RequestModuleSelectionDto {
  id?: number;
  moduleId: number;
  moduleName: string;
  moduleDescription?: string | null;
  modulePrice: number;
  parameters?: string | null;
}

export interface RequestStoreSelectionDto {
  id?: number;
  storeId: number;
  storeName: string;
  storeDescription?: string | null;
  storePrice: number;
  modules: RequestModuleSelectionDto[];
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
  contactImageUrl?: string | null;
  description?: string | null;
  bankDescription?: string | null;
  establishmentYear?: number | null;
  marketplaceSlug: string;
  marketplaceDescription?: string | null;
  primaryColor: string;
  secondaryColor: string;
  banniereUrl?: string | null;
  selectedStores?: string | null;
  selectedModules?: string | null;
  selectedStoreDetails?: RequestStoreSelectionDto[];
  storeIds: number[];
  moduleIds: number[];
  totalAmount: number;
  totalMonthlyPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequestPayload {
  bankName: string;
  bankEmail: string;
  country: string;
  website?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactImage?: File | null;
  description?: string;
  bankDescription?: string;
  establishmentYear?: number;
  marketplaceSlug: string;
  marketplaceDescription?: string;
  primaryColor: string;
  secondaryColor: string;
  banniere?: File | null;
  banniereUrl?: string;
  storeIds: number[];
  moduleIds: number[];
  selectedStores?: RequestStoreSelectionDto[];
  totalAmount: number;
  totalMonthlyPrice?: number;
  logo?: File | null;
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  requestId: number;
  status: NotificationStatus;
  createdAt?: string;
}
