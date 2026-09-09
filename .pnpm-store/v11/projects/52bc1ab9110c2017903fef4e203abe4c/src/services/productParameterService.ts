import apiClient from '../api/apiClient';
import type {
  ProductParameterDefinitionDto,
  ProductParameterDefinitionPayload,
} from '../types/apiTypes';

export const productParameterService = {
  getByStore: (storeId: number) =>
    apiClient.get<ProductParameterDefinitionDto[]>(`/product-parameter-definitions/store/${storeId}`),

  create: (payload: ProductParameterDefinitionPayload) =>
    apiClient.post<ProductParameterDefinitionDto>('/product-parameter-definitions', payload),

  update: (id: number, payload: ProductParameterDefinitionPayload) =>
    apiClient.put<ProductParameterDefinitionDto>(`/product-parameter-definitions/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete<void>(`/product-parameter-definitions/${id}`),
};
