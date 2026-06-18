import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Calculator } from 'lucide-react';

export function SimulatorModule() {
  useParams();
  const { branding } = useOutletContext<any>();

  const [amount, setAmount] = useState('50000');
  const [duration, setDuration] = useState('36');
  const [rate, setRate] = useState('5.5');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const principal = parseFloat(amount);
    const months = parseInt(duration);
    const monthlyRate = parseFloat(rate) / 100 / 12;

    const monthly = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                    (Math.pow(1 + monthlyRate, months) - 1);

    const total = monthly * months;
    const interest = total - principal;

    setResult({
      monthly: monthly.toFixed(2),
      total: total.toFixed(2),
      interest: interest.toFixed(2)
    });
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${branding.primary_color}20` }}>
            <Calculator className="w-8 h-8" style={{ color: branding.primary_color }} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Simulateur de crédit</h1>
          <p className="text-lg text-muted-foreground">
            Calculez vos mensualités en quelques secondes
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vos informations</CardTitle>
              <CardDescription>Renseignez les détails de votre projet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Montant souhaité (TND)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
              />
              <Select
                label="Durée (mois)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={[
                  { value: '12', label: '12 mois' },
                  { value: '24', label: '24 mois' },
                  { value: '36', label: '36 mois' },
                  { value: '48', label: '48 mois' },
                  { value: '60', label: '60 mois' },
                ]}
              />
              <Input
                label="Taux d'intérêt annuel (%)"
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="5.5"
              />
              <Button
                className="w-full"
                onClick={calculate}
                style={{ backgroundColor: branding.primary_color }}
              >
                Calculer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résultat de la simulation</CardTitle>
              <CardDescription>Détails de votre financement</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl" style={{ backgroundColor: `${branding.primary_color}10` }}>
                    <div className="text-sm text-muted-foreground mb-2">Mensualité</div>
                    <div className="text-4xl font-bold" style={{ color: branding.primary_color }}>
                      {parseFloat(result.monthly).toLocaleString('fr-TN')} TND
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between p-4 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Montant emprunté</span>
                      <span className="font-semibold">{parseFloat(amount).toLocaleString('fr-TN')} TND</span>
                    </div>
                    <div className="flex justify-between p-4 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Intérêts totaux</span>
                      <span className="font-semibold">{parseFloat(result.interest).toLocaleString('fr-TN')} TND</span>
                    </div>
                    <div className="flex justify-between p-4 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Coût total</span>
                      <span className="font-semibold">{parseFloat(result.total).toLocaleString('fr-TN')} TND</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Faire une demande
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Remplissez le formulaire et cliquez sur "Calculer" pour voir le résultat
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
