import { useOutletContext, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowRight, Star, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

export function MarketplaceHome() {
  const { bankData, branding } = useOutletContext<any>();

  return (
    <div className="min-h-screen bg-background">
      <section
        className="relative h-96 bg-cover bg-center flex items-center"
        style={branding.banner_image_url
          ? { backgroundImage: `url(${branding.banner_image_url})` }
          : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-4">{branding.homepage_title}</h1>
            <p className="text-xl mb-8 max-w-2xl opacity-90">{branding.welcome_text}</p>
            <div className="flex gap-4">
              <Link to={`/store/${bankData.stores[0]?.name}`}>
                <Button size="lg" style={{ backgroundColor: branding.primary_color }}>
                  Explorer nos solutions
                </Button>
              </Link>
              <Link to="/connexion">
                <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                  Se connecter
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: branding.primary_color }}>
              Nos solutions de financement
            </h2>
            <p className="text-lg text-muted-foreground">
              Découvrez nos offres adaptées à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bankData.stores.map((store: any, index: number) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/store/${store.name}`}>
                  <Card hover className="h-full">
                    <CardHeader>
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-4xl mb-4">
                        📦
                      </div>
                      <CardTitle>{store.label}</CardTitle>
                      <CardDescription>
                        Découvrez nos offres de financement {store.label.toLowerCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <Badge style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                          {store.modules.length} modules
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-warning text-warning" />
                          <span className="font-medium">4.8</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
                        Explorer
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
                <Users className="w-8 h-8" style={{ color: branding.primary_color }} />
              </div>
             
            </div>
            <div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
                <Star className="w-8 h-8" style={{ color: branding.primary_color }} />
              </div>
              
            </div>
            <div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
                <TrendingUp className="w-8 h-8" style={{ color: branding.primary_color }} />
              </div>
              <div className="text-3xl font-bold mb-2">{bankData.establishedYear}</div>
              <div className="text-muted-foreground">Année de création</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
