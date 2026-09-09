import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router';
import { BarChart3, ArrowLeft, Image as ImageIcon, Trash2, LayoutGrid, ArrowRightLeft, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { dealerService } from '../../../services/dealerService';
import { productService } from '../../../services/productService';
import type { ProductDto } from '../../../types/apiTypes';
import {
  getCompareStorageKey,
  readCompareProductIds,
  writeCompareProductIds,
} from '../../../utils/comparison';
import { isBannerModule } from '../../../utils/moduleVisibility';
import { resolveApiUrl } from '../../../api/apiClient';
import { BANNER_BACKGROUND_STYLE, BANNER_FRAME_CLASS } from '../../../config/banner';

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
  bannerImageUrl?: string | null;
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

type ComparisonFilter = 'all' | 'differences' | 'similarities';

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

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.trim().replace('#', '');

  if (normalized.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

const normalizeComparisonValue = (value?: string | null) =>
  (value || '-')
    .toString()
    .trim()
    .toLowerCase();

const isRowDifferent = (row: ComparisonRow, productIds: number[]) => {
  const values = productIds.map((productId) => normalizeComparisonValue(row.values.get(productId)));
  return new Set(values).size > 1;
};

const isRowSimilar = (row: ComparisonRow, productIds: number[]) => {
  const values = productIds.map((productId) => normalizeComparisonValue(row.values.get(productId)));
  return new Set(values).size === 1;
};

export function ComparatorModule() {
  const { storeSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { bankData, branding, marketplace } = useOutletContext<any>();
  const [products, setProducts] = useState<ComparatorProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>('all');

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
  const isBannerActive = modules.some(isBannerModule);
  const canCompare = modules.some(isComparatorModule);
  const navigationCompareIds = useMemo(() => {
    const candidate = (location.state as { compareProductIds?: unknown } | null)?.compareProductIds;
    return Array.isArray(candidate) ? candidate.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)).slice(0, 4) : [];
  }, [location.state]);

  useEffect(() => {
    if (!storesReady) {
      return;
    }

    if (!canCompare) {
      setCompareIds([]);
      return;
    }

    setCompareIds((navigationCompareIds.length ? navigationCompareIds : readCompareProductIds(compareStorageKey)).slice(0, 4));
  }, [canCompare, compareStorageKey, navigationCompareIds, storesReady]);

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
        const [bankResult, dealerResult] = await Promise.allSettled([
          productService.getByBank(marketplaceBankId),
          dealerService.marketplaceProducts(marketplaceSlug, currentStoreId),
        ]);
        const storeProducts = (bankResult.status === 'fulfilled' ? bankResult.value.data : [])
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
          }));
        const dealerProducts = (dealerResult.status === 'fulfilled' ? dealerResult.value.data : []).map((product): ComparatorProductItem => ({
          id: -product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          storeId: product.storeId,
          storeName: product.storeName,
          parameterValues: (product.parameterValues || []).map((value) => ({ id: value.definitionId, parameterDefinitionId: value.definitionId, parameterName: value.name, value: value.value })),
          createdAt: product.createdAt,
        }));
        const allProducts = [...storeProducts, ...dealerProducts]
          .sort((left, right) => getProductSortValue(right.createdAt) - getProductSortValue(left.createdAt));

        if (!cancelled) {
          setProducts(allProducts);
          setLoadingError(bankResult.status === 'rejected' && dealerResult.status === 'rejected');
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
  }, [currentStoreId, marketplaceBankId, marketplaceSlug]);

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

  const selectedProductIds = useMemo(
    () => selectedProducts.map((product) => product.id),
    [selectedProducts]
  );

  const visibleComparisonRows = useMemo(() => {
    if (!selectedProducts.length) {
      return [] as ComparisonRow[];
    }

    if (comparisonFilter === 'all') {
      return comparisonRows;
    }

    const parameterRowsOnly = comparisonRows.filter((row) => row.key !== 'price');
    return parameterRowsOnly.filter((row) =>
      comparisonFilter === 'differences'
        ? isRowDifferent(row, selectedProductIds)
        : isRowSimilar(row, selectedProductIds)
    );
  }, [comparisonFilter, comparisonRows, selectedProductIds, selectedProducts.length]);

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

  const toggleComparisonFilter = (nextFilter: Exclude<ComparisonFilter, 'all'>) => {
    setComparisonFilter((current) => (current === nextFilter ? 'all' : nextFilter));
  };

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  const storeLabel = store.label || store.name || `Store ${store.storeId || store.id}`;
  const customStoreBannerUrl = isBannerActive ? resolveApiUrl(store?.bannerImageUrl) : '';
  const storeBannerUrl = customStoreBannerUrl || (isBannerActive
    ? resolveApiUrl(store?.banniereUrl || store?.banniere_url)
    : '');
  const storeHeroOverlay = `linear-gradient(135deg, ${hexToRgba(branding.primary_color, 0.84)} 0%, ${hexToRgba(
    branding.secondary_color,
    0.78
  )} 100%)`;

  return (
    <div className="min-h-screen bg-slate-50">
      <section
        className={`relative ${BANNER_FRAME_CLASS} flex items-center px-4 py-12 text-white sm:px-6 lg:px-8`}
        style={
          storeBannerUrl
            ? BANNER_BACKGROUND_STYLE(storeBannerUrl)
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        {!customStoreBannerUrl && <div className="absolute inset-0" style={{ background: storeHeroOverlay }} />}
        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center">
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3 text-sm text-white/75">
                <button type="button" className="inline-flex items-center gap-2" onClick={backToStore}>
                  <ArrowLeft className="h-4 w-4" />
                  Retour au store
                </button>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Comparateur de produits</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">
                Comparez jusqu&apos;à 4 produits du même store et visualisez leurs caractéristiques côte à côte.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Comparateur de produits</h1>
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
              Retour au store
            </Button>
              <Button
                className="text-white"
                disabled={!canRenderComparison}
                onClick={clearComparison}
                style={{ backgroundColor: branding.primary_color }}
              >
                Vider la sélection
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
                          {resolveApiUrl(product.imageUrl) ? (
                            <img
                              src={resolveApiUrl(product.imageUrl)}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50" style={{ color: branding.primary_color }}>
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedProducts.length} produits sélectionnés</div>
                  <div className="mt-0.5 text-xs text-slate-500">Vous pouvez comparer jusqu&apos;à 4 produits à la fois.</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{compareIds.length} / 4</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min((compareIds.length / 4) * 100, 100)}%`, backgroundColor: branding.primary_color }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {selectedProducts.map((product) => {
                const imageUrl = resolveApiUrl(product.imageUrl);
                return (
                  <article key={product.id} className="relative flex min-h-28 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      aria-label={`Retirer ${product.name} de la comparaison`}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => removeProduct(product.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400"><ImageIcon className="h-5 w-5" /></div>
                      )}
                    </div>
                    <div className="min-w-0 pr-5">
                      <div className="truncate text-base font-bold text-slate-900">{product.name}</div>
                      <Badge variant="secondary" className="mt-2 rounded-full bg-cyan-50 text-xs" style={{ color: branding.primary_color }}>
                        {product.storeName || storeLabel}
                      </Badge>
                      <div className="mt-2 w-fit rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">{formatTnd(product.price)}</div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-3 gap-1 border-b border-slate-100 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`gap-2 rounded-lg text-xs ${comparisonFilter === 'all' ? 'text-white hover:text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  style={comparisonFilter === 'all' ? { backgroundColor: branding.primary_color } : undefined}
                  onClick={() => setComparisonFilter('all')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Vue d’ensemble
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`gap-2 rounded-lg text-xs ${comparisonFilter === 'differences' ? 'text-white hover:text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  style={comparisonFilter === 'differences' ? { backgroundColor: branding.primary_color } : undefined}
                  onClick={() => toggleComparisonFilter('differences')}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Différences
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`gap-2 rounded-lg text-xs ${comparisonFilter === 'similarities' ? 'text-white hover:text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  style={comparisonFilter === 'similarities' ? { backgroundColor: branding.primary_color } : undefined}
                  onClick={() => toggleComparisonFilter('similarities')}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Similarités
                </Button>
              </div>

            {visibleComparisonRows.length ? (
              <div className="p-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse overflow-hidden rounded-lg border border-slate-100">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="sticky left-0 z-20 min-w-[190px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-700">
                          Caractéristique
                        </th>
                        {selectedProducts.map((product) => (
                          <th key={product.id} className="min-w-[200px] border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-700">
                            {product.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleComparisonRows.map((row) => {
                        const rowIsDifferent = isRowDifferent(row, selectedProductIds);
                        const valueClassName = rowIsDifferent ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600';

                        return (
                          <tr key={row.key} className="odd:bg-white even:bg-slate-50/60">
                            <td className="sticky left-0 z-10 border-b border-slate-100 bg-inherit px-4 py-2.5 text-xs font-semibold text-slate-700">
                              {row.label}
                            </td>
                            {selectedProducts.map((product) => (
                              <td key={`${row.key}-${product.id}`} className="border-b border-slate-100 px-4 py-2.5 text-center align-top">
                                <div className={`text-xs ${valueClassName}`}>
                                  {row.values.get(product.id) || '-'}
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No parameters match the selected filter.
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
