import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { BarChart3, CheckCircle } from 'lucide-react';

export function ComparatorModule() {
  const { branding } = useOutletContext<any>();
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);

  const offers = [
    { id: '1', name: 'Offre Classic', rate: 5.5, duration: '12-60 mois', amount: 'Jusqu\'à 50,000 TND', popular: false },
    { id: '2', name: 'Offre Premium', rate: 5.0, duration: '12-72 mois', amount: 'Jusqu\'à 100,000 TND', popular: true },
    { id: '3', name: 'Offre Excellence', rate: 4.5, duration: '12-84 mois', amount: 'Jusqu\'à 200,000 TND', popular: false },
  ];

  const toggleOffer = (id: string) => {
    setSelectedOffers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
            <BarChart3 className="w-8 h-8" style={{ color: branding.primary_color }} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Comparateur d'offres</h1>
          <p className="text-lg text-muted-foreground">
            Comparez nos différentes offres de financement
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className={`${selectedOffers.includes(offer.id) ? 'border-2' : ''}`}
              style={selectedOffers.includes(offer.id) ? { borderColor: branding.primary_color } : {}}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle>{offer.name}</CardTitle>
                  {offer.popular && (
                    <Badge style={{ backgroundColor: `${branding.primary_color}`, color: 'white' }}>
                      Populaire
                    </Badge>
                  )}
                </div>
                <div className="text-4xl font-bold" style={{ color: branding.primary_color }}>
                  {offer.rate}%
                </div>
                <CardDescription>Taux annuel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Durée: {offer.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Montant: {offer.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Remboursement anticipé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Sans frais de dossier</span>
                  </div>
                </div>
                <Button
                  variant={selectedOffers.includes(offer.id) ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => toggleOffer(offer.id)}
                  style={selectedOffers.includes(offer.id) ? { backgroundColor: branding.primary_color } : {}}
                >
                  {selectedOffers.includes(offer.id) ? 'Sélectionné' : 'Sélectionner'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedOffers.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Comparaison détaillée</CardTitle>
              <CardDescription>
                {selectedOffers.length} {selectedOffers.length === 1 ? 'offre sélectionnée' : 'offres sélectionnées'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Critère</th>
                      {offers.filter(o => selectedOffers.includes(o.id)).map(offer => (
                        <th key={offer.id} className="text-center py-3 px-4">{offer.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 font-medium">Taux</td>
                      {offers.filter(o => selectedOffers.includes(o.id)).map(offer => (
                        <td key={offer.id} className="text-center py-3 px-4">{offer.rate}%</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 font-medium">Durée</td>
                      {offers.filter(o => selectedOffers.includes(o.id)).map(offer => (
                        <td key={offer.id} className="text-center py-3 px-4">{offer.duration}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 font-medium">Montant max</td>
                      {offers.filter(o => selectedOffers.includes(o.id)).map(offer => (
                        <td key={offer.id} className="text-center py-3 px-4">{offer.amount}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-6">
                <Button className="flex-1" style={{ backgroundColor: branding.primary_color }}>
                  Faire une demande
                </Button>
                <Button variant="outline" className="flex-1">
                  Télécharger le comparatif
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
