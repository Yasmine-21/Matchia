import { useParams, Link, useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Calculator, BarChart3, FileText, Bot } from 'lucide-react';

export function MarketplaceStore() {
  const { storeSlug } = useParams();
  const { bankData, branding } = useOutletContext<any>();

  const store = bankData.stores.find((s: any) => s.name === storeSlug);
  const storeBannerUrl = store?.banniere_url || branding.banner_image_url;

  if (!store) {
    return <div className="p-6">Store non trouvé</div>;
  }

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
            <span>{store.label}</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Financement {store.label}
          </h1>
          <p className="text-xl max-w-2xl text-white/90">
            {store.description || `Découvrez nos solutions de financement ${store.label.toLowerCase()} adaptées à vos besoins`}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Nos outils disponibles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {store.modules.map((module: any) => {
              const Icon = moduleIcons[module.name] || Calculator;
              const modulePath = module.name === 'simulator' ? 'simulator'
                : module.name === 'comparator' ? 'comparator'
                : module.name === 'blog' ? 'blog'
                : module.name;

              return (
                <Card key={module.id} hover>
                  <CardHeader>
                    <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                      <Icon className="w-7 h-7" />
                    </div>
                    <CardTitle>{module.label}</CardTitle>
                    <CardDescription>
                      {module.name === 'simulator' && 'Calculez vos mensualités en quelques clics'}
                      {module.name === 'comparator' && 'Comparez nos différentes offres'}
                      {module.name === 'blog' && 'Articles et conseils pratiques'}
                      {module.name === 'bot' && 'Assistant virtuel pour vous aider'}
                      {!['simulator', 'comparator', 'blog', 'bot'].includes(module.name) && 'Outil disponible pour vous'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/store/${storeSlug}/${modulePath}`}>
                      <Button className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
                        Utiliser
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
