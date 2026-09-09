const normalizeComparisonKey = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getCompareStorageKey = (marketplaceSlug?: string | null, storeSlug?: string | null) =>
  `matchia:compare:${normalizeComparisonKey(marketplaceSlug)}:${normalizeComparisonKey(storeSlug)}`;

export const readCompareProductIds = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [] as number[];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [] as number[];
    }

    return parsedValue
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [] as number[];
  }
};

export const writeCompareProductIds = (storageKey: string, productIds: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(productIds));
};

