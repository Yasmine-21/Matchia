import { useMemo } from 'react';
import { useParams, Link, useOutletContext } from 'react-router';
import { ArrowRight, BarChart3, Bot, Calculator, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

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
  id: number;
  storeId?: number | null;
  name?: string | null;
  label?: string | null;
  description?: string | null;
  banniere_url?: string | null;
  banniereUrl?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
  modules?: MarketplaceModuleDetail[];
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

export function MarketplaceStore() {
  const { storeSlug } = useParams();
  const { bankData, branding } = useOutletContext<any>();

  const store = useMemo(() => {
    const targetSlug = normalizeSlug(storeSlug);
    return (bankData?.stores || []).find((candidate: MarketplaceStoreDetail) => {
      return [candidate.name, candidate.label, candidate.storeId, candidate.id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => normalizeSlug(String(value)) === targetSlug);
    }) as MarketplaceStoreDetail | undefined;
  }, [bankData?.stores, storeSlug]);

  if (!store) {
    return <div className="p-6">Store non trouvé</div>;
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
        style={storeBannerUrl
          ? { backgroundImage: `url(${storeBannerUrl})` }
          : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <div className="flex items-center gap-2 text-sm text-white/80 mb-4">
            <Link to="/" className="hover:text-white">Accueil</Link>
            <span>/</span>
            <span>{storeLabel}</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Financement {storeLabel}
          </h1>
          <p className="text-xl max-w-2xl text-white/90">
            {store.description || `Découvrez nos solutions de financement ${storeLabel.toLowerCase()} adaptées à vos besoins`}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Modules disponibles pour ce store</h2>
          {modules.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-muted-foreground">
              Aucun module actif n&apos;est assigné à ce store.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => {
                const normalizedName = normalizeSlug(module.name || module.label);
                const Icon = moduleIcons[normalizedName] || Calculator;
                const moduleRoute = getModuleRoute(module.name || module.label, storeSlug);

                return (
                  <Card key={module.id} hover>
                    <CardHeader>
                      <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                        <Icon className="w-7 h-7" />
                      </div>
                      <CardTitle>{module.label || module.name}</CardTitle>
                      <CardDescription>
                        {module.category || 'Module disponible pour ce store'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {moduleRoute ? (
                        <Link to={moduleRoute}>
                          <Button className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
                            Utiliser
                          </Button>
                        </Link>
                      ) : (
                        <Button className="w-full" variant="outline" disabled>
                          Module disponible
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
