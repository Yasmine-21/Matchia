import apiClient from '../api/apiClient';

export type DealerStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PartnershipStatus = 'PENDING' | 'APPROVED' | 'WAITING_CONTRACT' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'TERMINATED';
export type PartnershipInitiator = 'DEALER' | 'BANK';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type PublicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
export type PartnershipContractStatus = 'DRAFT' | 'PENDING_ACCEPTANCE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
export type PartnershipCommissionType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface DealerView {
  id: number; companyName: string; registrationNumber: string; address: string; contactPerson: string;
  email: string; phone: string; website?: string; logoUrl?: string; contactPhotoUrl?: string; storeId: number; storeName: string; status: DealerStatus;
}
export interface DealerRequest extends Omit<DealerView, 'status'> {
  status: RequestStatus;
  documentUrls: string[]; rejectionReason?: string; submittedAt: string; processedAt?: string;
}
export interface StoreOption { storeId: number; storeName: string; description?: string }
export interface BankOption { bankId: number; bankName: string; bankLogoUrl?: string; marketplaceId: number; stores: StoreOption[] }
export interface Partnership {
  id: number; dealer: DealerView; bankId: number; bankName: string; bankLogoUrl?: string; storeId: number; storeName: string;
  initiatedBy: PartnershipInitiator; status: PartnershipStatus; message?: string; rejectionReason?: string;
  requestDate: string; processingDate?: string; approvedAt?: string; rejectedAt?: string;
}
export interface ParameterValue { definitionId: number; name?: string; value?: string }
export interface DealerProduct {
  id: number; dealerId: number; dealerName: string; storeId: number; storeName: string; name: string;
  description?: string; price: number; imageUrl?: string; eligibilityConditions?: string; status: ProductStatus;
  parameterValues: ParameterValue[]; createdAt?: string; updatedAt?: string;
}
export interface Publication {
  id: number; product: DealerProduct; dealerId: number; dealerName: string; bankId: number; bankName: string;
  bankLogoUrl?: string; marketplaceId: number; storeId: number; storeName: string; status: PublicationStatus; active: boolean;
  rejectionReason?: string; submittedAt: string; processedAt?: string;
}
export interface DashboardStats { products: number; activePartnerships: number; pendingPartnerships: number; pendingPublications: number; approvedPublications: number }
export interface DealerSettingsPayload {
  companyName: string;
  registrationNumber: string;
  storeId: number;
  website: string;
  removeLogo: boolean;
}
export interface PartnershipContract {
  id: number; contractNumber: string; partnershipId: number; dealerId: number; dealerName: string;
  bankId: number; bankName: string; storeId: number; storeName: string; status: PartnershipContractStatus;
  startDate: string; endDate: string; billingModel: 'FREE'; partnershipFee: number;
  commissionApplicable: boolean; commissionType?: PartnershipCommissionType; commissionValue?: number;
  contractTerms: string; terminationConditions: string; dealerAcceptedAt?: string; bankAcceptedAt?: string;
  sentAt?: string; rejectionReason?: string; createdAt: string; updatedAt: string;
}
export interface PartnershipContractPayload {
  startDate: string; endDate: string; commissionApplicable: boolean;
  commissionType?: PartnershipCommissionType; commissionValue?: number;
  contractTerms?: string; terminationConditions?: string;
}
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number }

const jsonPart = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' });

export const DEALER_BRANDING_UPDATED_EVENT = 'dealer-branding-updated';

export const dealerService = {
  register(data: Record<string, unknown>, logo: File, documents: File[], contactPhoto?: File) {
    const form = new FormData(); form.append('data', jsonPart(data)); form.append('logo', logo);
    if (contactPhoto) form.append('contactPhoto', contactPhoto);
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
  updateSettings(data: DealerSettingsPayload, logo?: File) {
    const form = new FormData();
    form.append('data', jsonPart(data));
    if (logo) form.append('logo', logo);
    return apiClient.put<DealerView>('/api/dealer/me', form);
  },
  dashboard() { return apiClient.get<DashboardStats>('/api/dealer/dashboard'); },
  availableBanks() { return apiClient.get<BankOption[]>('/api/dealer/available-banks'); },
  partnerships() { return apiClient.get<Partnership[]>('/api/dealer/partnerships'); },
  dealerSentPartnerships() { return apiClient.get<Partnership[]>('/api/dealer/partnerships/sent'); },
  dealerReceivedPartnerships() { return apiClient.get<Partnership[]>('/api/dealer/partnerships/received'); },
  dealerActivePartnerships() { return apiClient.get<Partnership[]>('/api/dealer/partnerships/active'); },
  requestPartnership(bankId: number, storeId: number, message?: string) { return apiClient.post<Partnership>('/api/dealer/partnerships', { bankId, storeId, message }); },
  approveDealerInvitation(id: number) { return apiClient.post<Partnership>(`/api/dealer/partnerships/${id}/approve`); },
  rejectDealerInvitation(id: number, reason: string) { return apiClient.post<Partnership>(`/api/dealer/partnerships/${id}/reject`, { reason }); },
  cancelDealerRequest(id: number) { return apiClient.post<Partnership>(`/api/dealer/partnerships/${id}/cancel`); },
  bankPartnershipStores() { return apiClient.get<StoreOption[]>('/api/bank/dealers/stores'); },
  dealersByStore(storeId: number) { return apiClient.get<DealerView[]>(`/api/bank/dealers/stores/${storeId}/dealers`); },
  availableDealers(storeId?: number) {
    return apiClient.get<DealerView[]>('/api/bank/dealers/available', {
      params: storeId ? { storeId } : undefined,
    });
  },
  inviteDealer(dealerId: number, storeId: number, message?: string) { return apiClient.post<Partnership>('/api/bank/dealers/partnerships', { dealerId, storeId, message }); },
  bankPartnerships() { return apiClient.get<Partnership[]>('/api/bank/dealers/partnerships'); },
  bankSentPartnerships() { return apiClient.get<Partnership[]>('/api/bank/dealers/partnerships/sent'); },
  bankReceivedPartnerships() { return apiClient.get<Partnership[]>('/api/bank/dealers/partnerships/received'); },
  bankActivePartnerships() { return apiClient.get<Partnership[]>('/api/bank/dealers/partnerships/active'); },
  approveBankRequest(id: number) { return apiClient.post<Partnership>(`/api/bank/dealers/partnerships/${id}/approve`); },
  rejectBankRequest(id: number, reason: string) { return apiClient.post<Partnership>(`/api/bank/dealers/partnerships/${id}/reject`, { reason }); },
  cancelBankInvitation(id: number) { return apiClient.post<Partnership>(`/api/bank/dealers/partnerships/${id}/cancel`); },
  decidePartnership(id: number, status: PartnershipStatus, reason?: string) { return apiClient.put<Partnership>(`/api/bank/dealers/partnerships/${id}/${status}`, { reason }); },
  bankContracts() { return apiClient.get<PartnershipContract[]>('/api/bank/dealers/contracts'); },
  saveContract(partnershipId: number, data: PartnershipContractPayload) { return apiClient.post<PartnershipContract>(`/api/bank/dealers/partnerships/${partnershipId}/contract`, data); },
  sendContract(id: number) { return apiClient.post<PartnershipContract>(`/api/bank/dealers/contracts/${id}/send`); },
  activateContract(id: number) { return apiClient.post<PartnershipContract>(`/api/bank/dealers/contracts/${id}/activate`); },
  terminateContract(id: number, reason: string) { return apiClient.post<PartnershipContract>(`/api/bank/dealers/contracts/${id}/terminate`, { reason }); },
  dealerContracts() { return apiClient.get<PartnershipContract[]>('/api/dealer/contracts'); },
  acceptContract(id: number) { return apiClient.post<PartnershipContract>(`/api/dealer/contracts/${id}/accept`); },
  rejectContract(id: number, reason: string) { return apiClient.post<PartnershipContract>(`/api/dealer/contracts/${id}/reject`, { reason }); },
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
