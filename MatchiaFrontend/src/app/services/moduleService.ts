import apiClient from '../api/apiClient'; // Ton instance axios
import { ModuleAssignment, ModuleParameter, ModuleDto } from '../types/apiTypes';

export const moduleService = {
  getAllModules: () => apiClient.get<ModuleDto[]>('/modules'),

  createModule: (moduleData: Omit<ModuleDto, 'id' | 'createdAt'>) =>
    apiClient.post<ModuleDto>('/modules', moduleData),

  updateModuleStatus: (id: number, status: string) =>
    apiClient.patch(`/modules/${id}/status`, { status }),



  getStoreModulesWithConfig: (storeId: number): Promise<{ data: ModuleAssignment[] }> =>
    apiClient.get(`/modulestores/store/${storeId}`),

  // Assigner un module à un store
  assignModuleToStore: (storeId: number, moduleId: number, config?: { ordre?: number }) =>
    apiClient.post('/modulestores', { storeId, moduleId, ...config }),

  assignModuleToStoreFull: (payload: {
    storeId: number;
    moduleId: number;
    actif: boolean;
    ordre: number;
    parameters: Array<{
      label: string;
      code: string;
      type: string;
      required: boolean;
    }>;
  }) => apiClient.post('/modulestores/assign-full', payload),

  // Désassigner un module d'un store
  unassignModuleFromStore: (storeId: number, moduleId: number) =>
    apiClient.delete(`/modulestores/store/${storeId}/module/${moduleId}`),

  // Activer/Désactiver un module pour un store
  toggleModuleForStore: (storeId: number, moduleId: number, isActive: boolean) =>
    apiClient.patch(`/modulestores/store/${storeId}/module/${moduleId}`, { actif: isActive }),

  // Mettre à jour les paramètres d'un module pour un store
  updateModuleParameters: (storeId: number, moduleId: number, parameters: ModuleParameter[]) =>
    apiClient.put(`/modulestores/store/${storeId}/module/${moduleId}/parameters`, { parameters }),

  // Mettre à jour un paramètre spécifique
  updateSingleParameter: (storeId: number, moduleId: number, parameterId: number, value: any) =>
    apiClient.patch(`/modulestores/store/${storeId}/module/${moduleId}/parameters/${parameterId}`, { value }),

};