import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router';
import { BarChart3, Bot, Calculator, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { contentService } from '../../services/contentService';
import { marketplaceContentService } from '../../services/marketplaceContentService';
import type { ContentDto, MarketplaceContentDto } from '../../types/apiTypes';

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

  if (normalized === 'simulator') return `/store/${encodedStoreSlug}/simulator`;
  if (normalized === 'comparator') return `/store/${encodedStoreSlug}/comparator`;
  if (normalized === 'blog') return `/store/${encodedStoreSlug}/blog`;

  return null;
};

const getContentSortValue = (createdAt?: string | null) => {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

function ContentBlock({
  content,
  index,
  fallbackImageUrl,
  primaryColor,
}: {
  content: StoreContentItem;
  index: number;
  fallbackImageUrl: string;
  primaryColor: string;
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

        <Link
          to="#"
          className="inline-flex w-fit items-center font-semibold underline decoration-2 underline-offset-4 transition-colors hover:text-lime-700"
          style={{ color: primaryColor, textDecorationColor: primaryColor }}
          onClick={(event) => event.preventDefault()}
        >
          Plus de détails
        </Link>
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

export function MarketplaceStore() {
  const { storeSlug } = useParams();
  const { bankData, branding, marketplace } = useOutletContext<any>();
  const [contents, setContents] = useState<StoreContentItem[]>([]);
  const [contentsLoading, setContentsLoading] = useState(true);
  const [contentsError, setContentsError] = useState(false);

  const store = useMemo(() => {
    const targetSlug = normalizeSlug(storeSlug);
    return (bankData?.stores || []).find((candidate: MarketplaceStoreDetail) => {
      return [candidate.name, candidate.label, candidate.slug, candidate.storeId, candidate.id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => normalizeSlug(String(value)) === targetSlug);
    }) as MarketplaceStoreDetail | undefined;
  }, [bankData?.stores, storeSlug]);

  const marketplaceSlug = bankData?.slug || marketplace?.bankSlug || '';

  const currentStoreId = useMemo(() => {
    if (!store) return null;
    const numericId = Number(store.storeId ?? store.id);
    return Number.isNaN(numericId) ? null : numericId;
  }, [store]);

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

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  const storeLabel = store.label || store.name || `Store ${store.storeId || store.id}`;
  const storeBannerUrl = getBackendAssetUrl(store.banniereUrl || store.banniere_url) || branding.banner_image_url;
  const modules = (store.modules || []).filter((module) => module.enabled !== false && module.visible !== false);
  const moduleIcons: Record<string, any> = {
    simulator: Calculator,
    comparator: BarChart3,
    blog: FileText,
    bot: Bot,
  };

  return (
    <div className="min-h-screen bg-background">
      <section
        className="relative bg-cover bg-center py-20"
        style={
          storeBannerUrl
            ? { backgroundImage: `url(${storeBannerUrl})` }
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 text-white sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/80">
            <Link to="/" className="hover:text-white">
              Accueil
            </Link>
            <span>/</span>
            <span>{storeLabel}</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold">Financement {storeLabel}</h1>
          <p className="max-w-2xl text-xl text-white/90">
            {store.description || `Decouvrez nos solutions de financement ${storeLabel.toLowerCase()} adaptees a vos besoins`}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Contenus du store</p>
            <h2 className="mt-3 text-center font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Contenus liés à {storeLabel}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-lg leading-8 text-slate-600">
              Les contenus standards et personnalisés publiés pour cette boutique s&apos;affichent ici selon le même style éditorial que votre exemple.
            </p>
          </div>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <ModuleSidebar modules={modules} storeSlug={storeSlug} moduleIcons={moduleIcons} />

            <div className="min-w-0 flex-1 lg:pl-[150px]">
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
                      primaryColor={branding.primary_color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
