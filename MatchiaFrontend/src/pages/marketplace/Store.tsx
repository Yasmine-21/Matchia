import { useParams, Link, useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowRight, Calculator, BarChart3, FileText, Bot } from 'lucide-react';

export function MarketplaceStore() {
  const { bankSlug, storeSlug } = useParams();
  const { bankData, branding } = useOutletContext<any>();

  const store = bankData.stores.find((s: any) => s.name === storeSlug);

  if (!store) {
    return <div className="p-6">Store non trouvé</div>;
  }

  const moduleIcons: Record<string, any> = {
    'simulator': Calculator,
    'comparator': BarChart3,
    'blog': FileText,
    'bot': Bot
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to={`/marketplace/${bankSlug}`} className="hover:text-primary">Accueil</Link>
            <span>/</span>
            <span>{store.label}</span>
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ color: branding.primary_color }}>
            Financement {store.label}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Découvrez nos solutions de financement {store.label.toLowerCase()} adaptées à vos besoins
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Nos outils disponibles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {store.modules.map((module: any) => {
              const Icon = moduleIcons[module.name] || Calculator;
              const modulePath = module.name === 'simulator' ? 'simulator' :
                                module.name === 'comparator' ? 'comparator' :
                                module.name === 'blog' ? 'blog' : module.name;

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
                    <Link to={`/marketplace/${bankSlug}/store/${storeSlug}/${modulePath}`}>
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

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Offres populaires</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                      Populaire
                    </Badge>
                    <span className="text-sm text-muted-foreground">Taux variable</span>
                  </div>
                  <CardTitle>Offre Premium {i}</CardTitle>
                  <CardDescription>Jusqu'à 60 mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-3xl font-bold" style={{ color: branding.primary_color }}>
                      {(5 + i * 0.5).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taux annuel</div>
                  </div>
                  <Button variant="outline" className="w-full">
                    En savoir plus
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
