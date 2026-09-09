import { useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileText, Calendar, User, ArrowRight } from 'lucide-react';

export function BlogModule() {
  const { branding } = useOutletContext<any>();

  const articles = [
    {
      id: '1',
      title: 'Guide complet du financement automobile en 2026',
      excerpt: 'Découvrez tout ce qu\'il faut savoir pour financer l\'achat de votre voiture en 2026.',
      category: 'Guides',
      date: '2026-04-15',
      author: 'Équipe Matchia',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=400&fit=crop'
    },
    {
      id: '2',
      title: 'Les meilleurs taux de crédit ce mois-ci',
      excerpt: 'Analyse des taux actuels et conseils pour obtenir le meilleur financement.',
      category: 'Actualités',
      date: '2026-04-12',
      author: 'Expert Finance',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop'
    },
    {
      id: '3',
      title: 'Comment améliorer votre dossier de crédit',
      excerpt: 'Nos conseils pour maximiser vos chances d\'obtenir un crédit avantageux.',
      category: 'Conseils',
      date: '2026-04-10',
      author: 'Conseiller Banque',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
            <FileText className="w-8 h-8" style={{ color: branding.primary_color }} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Blog & Conseils</h1>
          <p className="text-lg text-muted-foreground">
            Actualités et guides pour vos projets de financement
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <Button variant="primary" size="sm" style={{ backgroundColor: branding.primary_color }}>
            Tous
          </Button>
          <Button variant="outline" size="sm">Guides</Button>
          <Button variant="outline" size="sm">Actualités</Button>
          <Button variant="outline" size="sm">Conseils</Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Card key={article.id} hover>
              <div className="h-48 overflow-hidden rounded-t-xl">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2 mb-3">
                  <Badge style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                    {article.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(article.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <CardTitle>{article.title}</CardTitle>
                <CardDescription>{article.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    {article.author}
                  </div>
                  <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                    Lire
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline">Voir plus d'articles</Button>
        </div>
      </div>
    </div>
  );
}
