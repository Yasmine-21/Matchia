import apiClient from '../api/apiClient';

export type DealerStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PartnershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'TERMINATED';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type PublicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export interface DealerView {
  id: number; companyName: string; registrationNumber: string; address: string; contactPerson: string;
  email: string; phone: string; logoUrl?: string; storeId: number; storeName: string; status: DealerStatus;
}
export interface DealerRequest extends Omit<DealerView, 'status'> {
  status: RequestStatus;
  documentUrls: string[]; rejectionReason?: string; submittedAt: string; processedAt?: string;
}
export interface StoreOption { storeId: number; storeName: string; description?: string }
export interface BankOption { bankId: number; bankName: string; bankLogoUrl?: string; marketplaceId: number; stores: StoreOption[] }
export interface Partnership {
  id: number; dealer: DealerView; bankId: number; bankName: string; storeId: number; storeName: string;
  status: PartnershipStatus; message?: string; rejectionReason?: string; requestDate: string; processingDate?: string;
}
export interface ParameterValue { definitionId: number; name?: string; value?: string }
export interface DealerProduct {
  id: number; dealerId: number; dealerName: string; storeId: number; storeName: string; name: string;
  description?: string; price: number; imageUrl?: string; eligibilityConditions?: string; status: ProductStatus;
  parameterValues: ParameterValue[]; createdAt?: string; updatedAt?: string;
}
export interface Publication {
  id: number; product: DealerProduct; dealerId: number; dealerName: string; bankId: number; bankName: string;
  marketplaceId: number; storeId: number; storeName: string; status: PublicationStatus; active: boolean;
  rejectionReason?: string; submittedAt: string; processedAt?: string;
}
export interface DashboardStats { products: number; activePartnerships: number; pendingPartnerships: number; pendingPublications: number; approvedPublications: number }
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number }

const jsonPart = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' });

export const dealerService = {
  register(data: Record<string, unknown>, logo: File, documents: File[]) {
    const form = new FormData(); form.append('data', jsonPart(data)); form.append('logo', logo);
    documents.forEach((document) => form.append('documents', document));
    return apiClient.post<DealerRequest>('/api/public/dealers/requests', form);
  },
  getSaasRequests(params: Record<string, unknown>) { return apiClient.get<Page<DealerRequest>>('/api/saas/dealers/requests', { params }); },
  getRequestDocument(requestId: number, documentIndex: number) {
    return apiClient.get<Blob>(`/api/saas/dealers/requests/${requestId}/documents/${documentIndex}`, {
      responseType: 'blob',
    });
  },
  approveRequest(id: number) { return apiClient.put<DealerView>(`/api/saas/dealers/requests/${id}/approve`); },
  rejectRequest(id: number, reason: string) { return apiClient.put<DealerRequest>(`/api/saas/dealers/requests/${id}/reject`, { reason }); },
  me() { return apiClient.get<DealerView>('/api/dealer/me'); },
  dashboard() { return apiClient.get<DashboardStats>('/api/dealer/dashboard'); },
  availableBanks() { return apiClient.get<BankOption[]>('/api/dealer/available-banks'); },
  partnerships() { return apiClient.get<Partnership[]>('/api/dealer/partnerships'); },
  requestPartnership(bankId: number, storeId: number, message?: string) { return apiClient.post<Partnership>('/api/dealer/partnerships', { bankId, storeId, message }); },
  bankPartnerships() { return apiClient.get<Partnership[]>('/api/bank/dealers/partnerships'); },
  decidePartnership(id: number, status: PartnershipStatus, reason?: string) { return apiClient.put<Partnership>(`/api/bank/dealers/partnerships/${id}/${status}`, { reason }); },
  products() { return apiClient.get<DealerProduct[]>('/api/dealer/products'); },
  saveProduct(data: Record<string, unknown>, image?: File, id?: number) {
    const form = new FormData(); form.append('data', jsonPart(data)); if (image) form.append('image', image);
    return id ? apiClient.put<DealerProduct>(`/api/dealer/products/${id}`, form) : apiClient.post<DealerProduct>('/api/dealer/products', form);
  },
  deleteProduct(id: number) { return apiClient.delete(`/api/dealer/products/${id}`); },
  publications() { return apiClient.get<Publication[]>('/api/dealer/publications'); },
  submitProduct(productId: number, partnershipId: number) { return apiClient.post<Publication>('/api/dealer/publications', { productId, partnershipId }); },
  bankPublications() { return apiClient.get<Publication[]>('/api/bank/dealers/publications'); },
  decidePublication(id: number, status: PublicationStatus, reason?: string) { return apiClient.put<Publication>(`/api/bank/dealers/publications/${id}/${status}`, { reason }); },
  marketplaceProducts(bankSlug: string, storeId: number) {
    return apiClient.get<DealerProduct[]>(`/api/public/dealers/marketplaces/${encodeURIComponent(bankSlug)}/stores/${storeId}/products`);
  },
};
