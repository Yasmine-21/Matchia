export type StoreProductFamily = 'vehicle' | 'mobile' | 'medical' | 'realEstate' | 'other';

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const getStoreProductFamily = (storeName?: string): StoreProductFamily => {
  const value = normalize(storeName);
  if (value.includes('mobile') || value.includes('smartphone') || value.includes('telephone')) return 'mobile';
  if (value.includes('medical') || value.includes('sante') || value.includes('health')) return 'medical';
  if (value.includes('immobilier') || value.includes('realestate') || value.includes('propriet')) return 'realEstate';
  if (value.includes('vehicule') || value.includes('vehicle') || value.includes('auto')) return 'vehicle';
  return 'other';
};

export const getStoreParameterInput = (storeName: string | undefined, parameterName: string) => {
  const family = getStoreProductFamily(storeName);
  const name = normalize(parameterName);
  const numeric = (family === 'mobile' && (name.includes('ram') || name.includes('stockageinterne') || name.includes('batterie')))
    || (family === 'realEstate' && (name.includes('surface') || name.includes('nombredechambres') || name.includes('nombredesallesdebain') || name.includes('nombredepieces') || name === 'etage'));
  const positive = name.includes('ram') || name.includes('stockageinterne') || name.includes('batterie') || name.includes('surface');
  return { type: numeric ? 'number' : 'text', min: numeric ? (positive ? 1 : 0) : undefined, step: numeric ? 1 : undefined };
};

export const storeProductFamilyLabel: Record<StoreProductFamily, string> = {
  vehicle: 'Véhicule', mobile: 'Mobile', medical: 'Équipement médical', realEstate: 'Immobilier', other: 'Produit',
};
