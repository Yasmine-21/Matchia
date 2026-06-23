import apiClient from '../api/apiClient';
import type { ProductDto, ProductPayload } from '../types/apiTypes';

const toFormData = (payload: ProductPayload) => {
  const formData = new FormData();
  formData.append('bankId', String(payload.bankId));
  formData.append('storeId', String(payload.storeId));
  formData.append('name', payload.name);
  formData.append('description', payload.description ?? '');
  if (payload.price !== undefined && payload.price !== null && `${payload.price}`.trim() !== '') {
    formData.append('price', String(payload.price));
  }
  formData.append('parameterValues', JSON.stringify(payload.parameterValues || []));
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return formData;
};

export const productService = {
  getByBank: (bankId: number) =>
    apiClient.get<ProductDto[]>(`/products/bank/${bankId}`),

  getByStore: (storeId: number) =>
    apiClient.get<ProductDto[]>(`/products/store/${storeId}`),

  getById: (id: number) =>
    apiClient.get<ProductDto>(`/products/${id}`),

  create: (payload: ProductPayload) =>
    apiClient.post<ProductDto>('/products', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, payload: ProductPayload) =>
    apiClient.put<ProductDto>(`/products/${id}`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: number) =>
    apiClient.delete<void>(`/products/${id}`),
};
