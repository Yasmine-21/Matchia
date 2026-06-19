import apiClient from '../api/apiClient';
import type { ProductDto, ProductPayload } from '../types/apiTypes';

export const productService = {
  getByBank: (bankId: number) =>
    apiClient.get<ProductDto[]>(`/products/bank/${bankId}`),

  getByStore: (storeId: number) =>
    apiClient.get<ProductDto[]>(`/products/store/${storeId}`),

  getById: (id: number) =>
    apiClient.get<ProductDto>(`/products/${id}`),

  create: (payload: ProductPayload) =>
    apiClient.post<ProductDto>('/products', payload),

  update: (id: number, payload: ProductPayload) =>
    apiClient.put<ProductDto>(`/products/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete<void>(`/products/${id}`),
};
