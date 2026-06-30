import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router';
import { BarChart3, Bot, Calculator, Check, FileText, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { contentService } from '../../services/contentService';
import { marketplaceContentService } from '../../services/marketplaceContentService';
import { productService } from '../../services/productService';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { ContentDto, MarketplaceContentDto, ProductDto } from '../../types/apiTypes';
import { getCompareStorageKey, readCompareProductIds, writeCompareProductIds } from '../../utils/comparison';

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

interface StoreContentItem {
  id: string;
  source: 'standard' | 'marketplace';
  title: string;
  description: string;
  imageUrl?: string | null;
  storeId?: number | null;
  storeName?: string | null;
  createdAt?: string | null;
}

interface StoreProductItem {
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

const normalizeSlug = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

const getModuleRoute = (moduleName?: string | null, storeSlug?: string) => {
  const normalized = normalizeSlug(moduleName);
  const encodedStoreSlug = encodeURIComponent(storeSlug || '');

  if (normalized === 'simulator' || normalized === 'simulateur' || normalized.includes('simulat')) {
    return `/store/${encodedStoreSlug}/simulator`;
  }
  if (normalized === 'comparator' || normalized === 'comparateur' || normalized === 'comparatuer' || normalized === 'compare') {
    return `/store/${encodedStoreSlug}/comparator`;
  }
  if (normalized === 'blog') return `/store/${encodedStoreSlug}/blog`;

  return null;
};

const getContentSortValue = (createdAt?: string | null) => {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const getProductSortValue = (createdAt?: string) => {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
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

const normalizeModuleKey = (value?: string | null) =>
  normalizeSlug(value).replace(/^module-/, '');

const isSimulatorModule = (module: MarketplaceModuleDetail) => {
  const keys = [module.name, module.label, module.category]
    .map((value) => normalizeModuleKey(value))
    .filter(Boolean);

  return keys.some((key) => key.includes('simulat'));
};

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

function ContentBlock({
  content,
  index,
  fallbackImageUrl,
}: {
  content: StoreContentItem;
  index: number;
  fallbackImageUrl: string;
}) {
  const reversed = index % 2 === 1;
  const imageUrl = getBackendAssetUrl(content.imageUrl) || fallbackImageUrl;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      className={`flex flex-col items-center gap-12 lg:gap-16 ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}
    >
      <div className="w-full lg:w-[60%]">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-slate-100 shadow-[0_24px_52px_rgba(15,23,42,0.12)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={content.title}
              className="h-[320px] w-full object-cover sm:h-[390px] lg:h-[440px]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-[320px] items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 text-slate-500 sm:h-[390px] lg:h-[440px]">
              Aucun visuel disponible
            </div>
          )}
        </div>
      </div>

      <div className={`w-full space-y-6 lg:w-[40%] ${reversed ? 'lg:pr-2' : 'lg:pl-2'}`}>
        <h3 className="max-w-none font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.5rem]">
          {content.title}
        </h3>

        <p className="max-w-none text-justify text-[15px] leading-8 text-slate-600 sm:text-[1.08rem]">
          {content.description}
        </p>

      </div>
    </motion.article>
  );
}

function ModuleSidebar({
  modules,
  storeSlug,
  moduleIcons,
}: {
  modules: MarketplaceModuleDetail[];
  storeSlug?: string;
  moduleIcons: Record<string, any>;
}) {
  if (!modules.length) {
    return null;
  }

  return (
    <aside className="w-full lg:fixed lg:left-4 lg:top-[420px] lg:z-30 lg:w-[150px]">
      <div className="rounded-[2rem] bg-transparent p-0 lg:bg-transparent">
        <div className="flex flex-wrap gap-3 lg:flex-col lg:gap-3">
          {modules.map((module) => {
            const moduleName = module.name || module.label;
            const label = module.label || module.name || 'Module';
            const normalizedName = normalizeSlug(moduleName);
            const Icon = moduleIcons[normalizedName] || Calculator;
            const moduleRoute = getModuleRoute(moduleName, storeSlug);

            const pill = (
              <div className="flex h-[48px] w-[150px] items-center gap-2 rounded-full bg-white px-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition-shadow hover:shadow-[0_14px_28px_rgba(15,23,42,0.16)]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lime-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 text-[13px] font-medium leading-tight text-slate-600">
                  <div className="truncate">{label}</div>
                </div>
              </div>
            );

            return moduleRoute ? (
              <Link key={module.id} to={moduleRoute} className="block">
                {pill}
              </Link>
            ) : (
              <div key={module.id} className="block">
                {pill}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function ProductCard({
  product,
  index,
  primaryColor,
  isComparatorActive,
  isInCompare,
  isSimulatorActive,
  onToggleCompare,
  onSimulate,
  onClick,
}: {
  product: StoreProductItem;
  index: number;
  primaryColor: string;
  isComparatorActive: boolean;
  isInCompare: boolean;
  isSimulatorActive: boolean;
  onToggleCompare: (product: StoreProductItem) => void;
  onSimulate: (product: StoreProductItem) => void;
  onClick: () => void;
}) {
  const imageUrl = getBackendAssetUrl(product.imageUrl);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white"
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 p-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-500 text-white/80">
            Aucun visuel disponible
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/65">Produit bancaire</div>
              <h3 className="mt-2 truncate text-xl font-semibold text-white">{product.name}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm leading-6 text-slate-600">
          {product.description || 'Aucune description fournie pour ce produit.'}
        </p>

        <div className="mt-auto pt-4 space-y-3">
          <div className="flex justify-end">
            <div className="text-lg font-bold text-red-600">{formatTnd(product.price)}</div>
          </div>

          {(isSimulatorActive || isComparatorActive) && (
            <div className={`grid gap-2 ${isSimulatorActive && isComparatorActive ? 'sm:grid-cols-2' : ''}`}>
              {isSimulatorActive && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-white"
                  icon={<Calculator className="h-4 w-4" />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSimulate(product);
                  }}
                  style={{ backgroundColor: primaryColor }}
                >
                  Simuler
                </Button>
              )}
              {isComparatorActive && (
                <Button
                  type="button"
                  variant={isInCompare ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full"
                  icon={isInCompare ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCompare(product);
                  }}
                >
                  {isInCompare ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function ProductDetailsModal({
  product,
  storeLabel,
  onClose,
}: {
  product: StoreProductItem | null;
  storeLabel: string;
  onClose: () => void;
}) {
  const imageUrl = getBackendAssetUrl(product?.imageUrl);
  const parameterValues = product?.parameterValues || [];

  return (
    <Modal isOpen={Boolean(product)} onClose={onClose} size="xl">
      {product && (
        <div className="space-y-6 text-slate-900">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-full min-h-[340px] w-full object-contain bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4"
                />
              ) : (
                <div className="flex min-h-[340px] w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-orange-600 text-white/80">
                  <ImageIcon className="h-14 w-14" />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-sm">
                    {product.storeName || storeLabel}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-red-200 backdrop-blur-sm">
                    {formatTnd(product.price)}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/70">Produit bancaire</div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">{product.name}</h2>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-400">Détails du produit</div>
                <h3 className="text-3xl font-semibold tracking-tight text-slate-900">{product.name}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {product.description || 'Aucune description fournie pour ce produit.'}
                </p>
              </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                <div className="mb-4 text-sm font-semibold text-slate-900">Caractéristiques</div>
                {parameterValues.length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Caractéristique
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Valeur
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parameterValues.map((parameter) => (
                          <tr key={parameter.id} className="odd:bg-white even:bg-slate-50/70">
                            <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                              {parameter.parameterName || `Paramètre ${parameter.parameterDefinitionId}`}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                              {parameter.value || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Aucun paramètre configuré pour ce produit.
                  </div>
                )}
              </div>

              <div className="flex justify-end rounded-[2rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                <div className="text-base font-semibold text-red-600">{formatTnd(product.price)}</div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function MarketplaceStore() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { bankData, branding, marketplace } = useOutletContext<any>();
  const [contents, setContents] = useState<StoreContentItem[]>([]);
  const [contentsLoading, setContentsLoading] = useState(true);
  const [contentsError, setContentsError] = useState(false);
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductItem | null>(null);
  const [compareProductIds, setCompareProductIds] = useState<number[]>([]);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  const store = useMemo(() => {
    const targetSlug = normalizeSlug(storeSlug);
    return (bankData?.stores || []).find((candidate: MarketplaceStoreDetail) => {
      return [candidate.name, candidate.label, candidate.slug, candidate.storeId, candidate.id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => normalizeSlug(String(value)) === targetSlug);
    }) as MarketplaceStoreDetail | undefined;
  }, [bankData?.stores, storeSlug]);

  const marketplaceSlug = bankData?.slug || marketplace?.bankSlug || '';
  const storesReady = Array.isArray(bankData?.stores);
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

  useEffect(() => {
    if (!marketplaceSlug || currentStoreId == null) {
      setContents([]);
      setContentsLoading(false);
      setContentsError(false);
      return;
    }

    let cancelled = false;

    const loadContents = async () => {
      setContentsLoading(true);
      setContentsError(false);

      const [standardResult, marketplaceResult] = await Promise.allSettled([
        contentService.getContentsByMarketplaceSlug(marketplaceSlug),
        marketplaceContentService.getContentsByMarketplaceSlug(marketplaceSlug),
      ]);

      const standardContents =
        standardResult.status === 'fulfilled'
          ? (standardResult.value.data || [])
              .filter((content: ContentDto) => content.status === 'active' && content.storeId === currentStoreId)
              .map((content: ContentDto): StoreContentItem => ({
                id: `standard-${content.id}`,
                source: 'standard',
                title: content.title,
                description: content.description,
                imageUrl: content.imageUrl,
                storeId: content.storeId,
                storeName: content.storeName,
                createdAt: content.createdAt ?? null,
              }))
          : [];

      const marketplaceContents =
        marketplaceResult.status === 'fulfilled'
          ? (marketplaceResult.value.data || [])
              .filter((content: MarketplaceContentDto) => content.status === 'active' && content.storeId === currentStoreId)
              .map((content: MarketplaceContentDto): StoreContentItem => ({
                id: `marketplace-${content.id}`,
                source: 'marketplace',
                title: content.title,
                description: content.description,
                imageUrl: content.imageUrl,
                storeId: content.storeId,
                storeName: content.storeName,
                createdAt: content.createdAt ?? null,
              }))
          : [];

      const nextContents = [...standardContents, ...marketplaceContents].sort(
        (left, right) => getContentSortValue(right.createdAt) - getContentSortValue(left.createdAt)
      );

      if (!cancelled) {
        setContents(nextContents);
        setContentsError(standardResult.status === 'rejected' && marketplaceResult.status === 'rejected');
        setContentsLoading(false);
      }
    };

    void loadContents();

    return () => {
      cancelled = true;
    };
  }, [marketplaceSlug, currentStoreId]);

  useEffect(() => {
    if (!marketplaceBankId || currentStoreId == null) {
      setProducts([]);
      setProductsLoading(false);
      setProductsError(false);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(false);

      try {
        const response = await productService.getByBank(marketplaceBankId);
        const storeProducts = (response.data || [])
          .filter((product) => product.storeId === currentStoreId)
          .map((product): StoreProductItem => ({
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
      } catch (loadError) {
        console.error('Failed to load products for marketplace store:', loadError);
        if (!cancelled) {
          setProducts([]);
          setProductsError(true);
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentStoreId, marketplaceBankId]);

  const storeLabel = store?.label || store?.name || `Store ${store?.storeId || store?.id || ''}`;
  const storeBannerUrl = branding.banner_image_url || getBackendAssetUrl(store?.banniereUrl || store?.banniere_url);
  const storeHeroOverlay = `linear-gradient(135deg, ${hexToRgba(branding.primary_color, 0.84)} 0%, ${hexToRgba(branding.secondary_color, 0.78)} 100%)`;
  const modules = (store?.modules || []).filter((module) => module.enabled !== false && module.visible !== false);
  const canSimulate = modules.some(isSimulatorModule);
  const canCompare = modules.some(isComparatorModule);
  const moduleIcons: Record<string, any> = {
    simulator: Calculator,
    comparator: BarChart3,
    blog: FileText,
    bot: Bot,
  };
  useEffect(() => {
    if (!storesReady) {
      return;
    }

    if (!canCompare) {
      setCompareProductIds([]);
      return;
    }

    setCompareProductIds(readCompareProductIds(compareStorageKey).slice(0, 4));
  }, [canCompare, compareStorageKey, storesReady]);

  useEffect(() => {
    if (!storesReady) {
      return;
    }

    if (!canCompare) {
      return;
    }

    writeCompareProductIds(compareStorageKey, compareProductIds.slice(0, 4));
  }, [canCompare, compareProductIds, compareStorageKey, storesReady]);

  const selectedCompareProducts = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return compareProductIds.map((productId) => productMap.get(productId)).filter(Boolean) as StoreProductItem[];
  }, [compareProductIds, products]);

  const compareCount = selectedCompareProducts.length;

  const toggleCompareProduct = (product: StoreProductItem) => {
    if (!canCompare) {
      return;
    }

    setCompareNotice(null);
    setCompareProductIds((current) => {
      if (current.includes(product.id)) {
        return current.filter((productId) => productId !== product.id);
      }

      if (current.length >= 4) {
        setCompareNotice('Vous pouvez comparer jusqu\'à 4 produits.');
        return current;
      }

      const currentStores = current
        .map((productId) => products.find((candidate) => candidate.id === productId)?.storeId)
        .filter((value): value is number => typeof value === 'number');

      if (currentStores.length > 0 && currentStores.some((storeId) => storeId !== product.storeId)) {
        setCompareNotice('Seuls les produits du même store peuvent être comparés.');
        return current;
      }

      return [...current, product.id];
    });
  };

  const openComparator = () => {
    if (!canCompare || compareCount < 2) {
      return;
    }

    const comparatorRoute = getModuleRoute('comparator', storeSlug);
    if (comparatorRoute) {
      navigate(comparatorRoute);
    }
  };

  const openSimulator = (product: StoreProductItem) => {
    if (!canSimulate) {
      return;
    }

    const simulatorRoute = getModuleRoute('simulator', storeSlug);
    if (simulatorRoute) {
      navigate(`${simulatorRoute}?productId=${product.id}`, {
        state: { productId: product.id },
      });
    }
  };

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <section
        className="relative h-96 flex items-center bg-cover bg-center"
        style={
          storeBannerUrl
            ? {
                backgroundImage: `url(${storeBannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0" style={{ background: storeHeroOverlay }} />
        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-4 text-white sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <h1 className="max-w-5xl text-5xl font-bold leading-tight mb-4">
              Financement {storeLabel}
            </h1>
            <p className="max-w-4xl text-xl leading-8 mb-8 opacity-90">
              {store.description || `Découvrez nos solutions de financement ${storeLabel.toLowerCase()} adaptees a vos besoins`}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={`/store/${encodeURIComponent(storeSlug || '')}`}>
                <Button
                  size="lg"
                  className="rounded-none"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Explorer nos solutions
                </Button>
              </Link>
              <Link to="/connexion">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/20"
                >
                  Se connecter
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>


      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Contenus du store</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Contenus liés à {storeLabel}
            </h2>
            <p className="mt-4 max-w-none text-lg leading-8 text-slate-600">
              Les contenus standards et personnalisés publiés pour cette boutique s&apos;affichent ici selon le même style éditorial que votre exemple.
            </p>
          </div>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <ModuleSidebar modules={modules} storeSlug={storeSlug} moduleIcons={moduleIcons} />

            <div className="min-w-0 flex-1 lg:pl-0">
              {contentsLoading ? (
                <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white/80 px-6 py-16 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Chargement des contenus...
                </div>
              ) : contentsError ? (
                <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-10 text-rose-700">
                  Impossible de charger les contenus pour ce store.
                </div>
              ) : contents.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  Aucun contenu actif n&apos;est disponible pour ce store.
                </div>
              ) : (
                <div className="space-y-32">
                  {contents.map((content, index) => (
                    <ContentBlock
                      key={content.id}
                      content={content}
                      index={index}
                      fallbackImageUrl={storeBannerUrl}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-24">
            <div className="mb-10 flex flex-col gap-4 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
              <div className="mx-auto max-w-3xl lg:mx-0">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Produits disponibles</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Produits disponibles
                </h2>
              </div>

              {canCompare && (
                <div className="flex flex-col items-center gap-2 lg:items-end">
                  <Button
                    type="button"
                    className="min-w-[220px]"
                    onClick={openComparator}
                    disabled={compareCount < 2}
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    Afficher le comparateur
                  </Button>
                  <div className="text-xs text-slate-500">
                    {compareCount}/4 sélectionnés. 2 produits minimum requis.
                  </div>
                </div>
              )}
            </div>

            {compareNotice && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {compareNotice}
              </div>
            )}

            {productsLoading ? (
              <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white/80 px-6 py-16 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Chargement des produits...
              </div>
            ) : productsError ? (
              <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-10 text-rose-700">
                Impossible de charger les produits disponibles pour ce store.
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                Aucun produit disponible pour ce store.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    primaryColor={branding.primary_color}
                    isComparatorActive={canCompare}
                    isInCompare={selectedCompareProducts.some((candidate) => candidate.id === product.id)}
                    isSimulatorActive={canSimulate}
                    onToggleCompare={toggleCompareProduct}
                    onSimulate={openSimulator}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <ProductDetailsModal
        product={selectedProduct}
        storeLabel={storeLabel}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

