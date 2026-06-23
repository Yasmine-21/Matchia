import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import { BarChart3, ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { productService } from '../../../services/productService';
import type { ProductDto } from '../../../types/apiTypes';
import {
  getCompareStorageKey,
  readCompareProductIds,
  writeCompareProductIds,
} from '../../../utils/comparison';

interface MarketplaceModuleDetail {
  id: number;
  moduleId?: number | null;
  name?: string | null;
  label?: string | null;
  category?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
}

interface MarketplaceStoreDetail {
  id: number | string;
  storeId?: number | null;
  name?: string | null;
  label?: string | null;
  slug?: string | null;
  description?: string | null;
  banniere_url?: string | null;
  banniereUrl?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
  modules?: MarketplaceModuleDetail[];
}

interface ComparatorProductItem {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  storeId: number;
  storeName?: string | null;
  parameterValues: ProductDto['parameterValues'];
  createdAt?: string;
}

interface ComparisonRow {
  key: string;
  label: string;
  values: Map<number, string>;
}

const normalizeSlug = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeModuleKey = (value?: string | null) => normalizeSlug(value).replace(/^module-/, '');

const isComparatorModule = (module: MarketplaceModuleDetail) => {
  const keys = [module.name, module.label, module.category]
    .map((value) => normalizeModuleKey(value))
    .filter(Boolean);

  return keys.some((key) =>
    ['comparator', 'comparateur', 'comparatuer', 'compare'].includes(key) || key.includes('comparat')
  );
};

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

const formatTnd = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return '-';
  }

  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const getProductSortValue = (createdAt?: string) => {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export function ComparatorModule() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { bankData, branding, marketplace } = useOutletContext<any>();
  const [products, setProducts] = useState<ComparatorProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const store = useMemo(() => {
    const targetSlug = normalizeSlug(storeSlug);
    return (bankData?.stores || []).find((candidate: MarketplaceStoreDetail) => {
      return [candidate.name, candidate.label, candidate.slug, candidate.storeId, candidate.id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => normalizeSlug(String(value)) === targetSlug);
    }) as MarketplaceStoreDetail | undefined;
  }, [bankData?.stores, storeSlug]);

  const marketplaceSlug = bankData?.slug || marketplace?.bankSlug || '';
  const marketplaceBankId = useMemo(() => {
    const rawBankId = marketplace?.bankId ?? bankData?.id ?? null;
    const numericBankId = Number(rawBankId);
    return Number.isNaN(numericBankId) ? null : numericBankId;
  }, [bankData?.id, marketplace?.bankId]);

  const currentStoreId = useMemo(() => {
    if (!store) return null;
    const numericId = Number(store.storeId ?? store.id);
    return Number.isNaN(numericId) ? null : numericId;
  }, [store]);

  const compareStorageKey = useMemo(
    () => getCompareStorageKey(marketplaceSlug, storeSlug),
    [marketplaceSlug, storeSlug]
  );

  const storesReady = Array.isArray(bankData?.stores);
  const modules = (store?.modules || []).filter((module) => module.enabled !== false && module.visible !== false);
  const canCompare = modules.some(isComparatorModule);

  useEffect(() => {
    if (!storesReady) {
      return;
    }

    if (!canCompare) {
      setCompareIds([]);
      return;
    }

    setCompareIds(readCompareProductIds(compareStorageKey).slice(0, 4));
  }, [canCompare, compareStorageKey, storesReady]);

  useEffect(() => {
    if (!storesReady) {
      return;
    }

    if (!canCompare) {
      return;
    }

    writeCompareProductIds(compareStorageKey, compareIds.slice(0, 4));
  }, [canCompare, compareIds, compareStorageKey, storesReady]);

  useEffect(() => {
    if (!marketplaceBankId || currentStoreId == null) {
      setProducts([]);
      setLoading(false);
      setLoadingError(false);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setLoadingError(false);

      try {
        const response = await productService.getByBank(marketplaceBankId);
        const storeProducts = (response.data || [])
          .filter((product) => product.storeId === currentStoreId)
          .map((product): ComparatorProductItem => ({
            id: product.id,
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            price: product.price,
            storeId: product.storeId,
            storeName: product.storeName,
            parameterValues: product.parameterValues || [],
            createdAt: product.createdAt,
          }))
          .sort((left, right) => getProductSortValue(right.createdAt) - getProductSortValue(left.createdAt));

        if (!cancelled) {
          setProducts(storeProducts);
        }
      } catch (error) {
        console.error('Failed to load comparator products:', error);
        if (!cancelled) {
          setProducts([]);
          setLoadingError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentStoreId, marketplaceBankId]);

  const selectedProducts = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return compareIds.map((productId) => productMap.get(productId)).filter(Boolean) as ComparatorProductItem[];
  }, [compareIds, products]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (!selectedProducts.length) {
      return [];
    }

    const rows: ComparisonRow[] = [
      {
        key: 'price',
        label: 'Prix',
        values: new Map(selectedProducts.map((product) => [product.id, formatTnd(product.price)])),
      },
    ];

    const parameterRows = new Map<number, ComparisonRow>();

    selectedProducts.forEach((product) => {
      product.parameterValues?.forEach((parameter) => {
        const rowKey = parameter.parameterDefinitionId;
        if (!parameterRows.has(rowKey)) {
          parameterRows.set(rowKey, {
            key: String(rowKey),
            label: parameter.parameterName || `Parametre ${rowKey}`,
            values: new Map(),
          });
        }

        parameterRows.get(rowKey)?.values.set(product.id, parameter.value || '-');
      });
    });

    return [...rows, ...Array.from(parameterRows.values())];
  }, [selectedProducts]);

  const canRenderComparison = canCompare && selectedProducts.length >= 2;
  const maxReached = compareIds.length >= 4;

  const removeProduct = (productId: number) => {
    setCompareIds((current) => current.filter((candidateId) => candidateId !== productId));
  };

  const clearComparison = () => {
    setCompareIds([]);
  };

  const backToStore = () => {
    navigate(`/store/${encodeURIComponent(storeSlug || '')}`);
  };

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  const storeLabel = store.label || store.name || `Store ${store.storeId || store.id}`;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
              <BarChart3 className="h-4 w-4" style={{ color: branding.primary_color }} />
              Comparator
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Comparateur de produits
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Comparez jusqu&apos;a 4 produits du meme store et visualisez les valeurs de leurs caracteristiques cote a cote.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-900 hover:bg-white"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={backToStore}
            >
              Back to store
            </Button>
            <Button
              className="text-white"
              disabled={!canRenderComparison}
              onClick={clearComparison}
              style={{ backgroundColor: branding.primary_color }}
            >
              Clear selection
            </Button>
          </div>
        </div>

        {!canCompare ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-10 text-amber-900 shadow-sm">
            <div className="text-xl font-semibold">Comparator module is not active for this store.</div>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              Please activate the Comparator module from the bank back office to compare products in this store.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center text-slate-500 shadow-sm">
            Loading comparison products...
          </div>
        ) : loadingError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-10 text-rose-700 shadow-sm">
            Unable to load products for comparison.
          </div>
        ) : !canRenderComparison ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                Select at least 2 products to compare
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Use the Add to Compare button on products from {storeLabel}. The comparison list is limited to 4 products.
              </p>

              {selectedProducts.length > 0 && (
                <div className="mt-8 w-full">
                  <div className="mb-3 text-left text-sm font-semibold text-slate-900">Current selection</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          {getBackendAssetUrl(product.imageUrl) ? (
                            <img
                              src={getBackendAssetUrl(product.imageUrl)}
                              alt={product.name}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-900">{product.name}</div>
                          <div className="truncate text-sm text-slate-500">{product.storeName || storeLabel}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 hover:bg-white"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {maxReached && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Maximum of 4 products reached.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Selected products</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedProducts.length} products selected
                  </div>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  {compareIds.length}/4
                </Badge>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-20 min-w-[220px] border-b border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Caracteristique
                      </th>
                      {selectedProducts.map((product) => {
                        const imageUrl = getBackendAssetUrl(product.imageUrl);

                        return (
                          <th
                            key={product.id}
                            className="min-w-[260px] border-b border-slate-200 px-5 py-4 text-left align-top"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="h-full w-full object-contain p-1"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                                        <ImageIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-slate-900">{product.name}</div>
                                    <div className="text-sm text-slate-500">{product.storeName || storeLabel}</div>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                                  onClick={() => removeProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <Badge variant="secondary" className="w-fit bg-red-50 text-red-600">
                                {formatTnd(product.price)}
                              </Badge>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.key} className="odd:bg-white even:bg-slate-50/60">
                        <td className="sticky left-0 z-10 border-b border-slate-100 bg-inherit px-5 py-4 text-sm font-semibold text-slate-700">
                          {row.label}
                        </td>
                        {selectedProducts.map((product) => (
                          <td key={`${row.key}-${product.id}`} className="border-b border-slate-100 px-5 py-4 align-top">
                            <div className={`text-sm ${row.key === 'price' ? 'font-semibold text-red-600' : 'text-slate-900'}`}>
                              {row.values.get(product.id) || '-'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
