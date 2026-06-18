import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/progress';
import { Eye } from 'lucide-react';

const certificateRows = [
  {
    id: '1',
    bank: 'Banque Centrale',
    store: 'Store Financement',
    module: 'API Paiement',
    type: 'SSL',
    reference: 'SSL-2345-****',
    issued: '2025-10-12',
    expires: '2026-10-12',
    status: 78,
  },
  {
    id: '2',
    bank: 'Crédit Plus',
    store: 'Store Epargne',
    module: 'API Signature',
    type: 'API',
    reference: 'API-78AB-****',
    issued: '2026-02-01',
    expires: '2026-08-01',
    status: 35,
  },
  {
    id: '3',
    bank: 'Finance Express',
    store: 'Store Projets',
    module: 'Module Sécurité',
    type: 'SSL',
    reference: 'SSL-9921-****',
    issued: '2025-08-22',
    expires: '2026-08-22',
    status: 65,
  },
];

export function Certificates() {
  const stats = useMemo(
    () => [
      { label: 'Actifs', value: 84, variant: 'primary' },
      { label: 'Expirant bientôt', value: 12, variant: 'warning' },
      { label: 'Expirés', value: 4, variant: 'danger' },
      { label: 'Révoqués', value: 2, variant: 'secondary' },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sécurité et Certificats</h1>
          <p className="text-gray-600 mt-2">Gérez les certificats SSL et API pour les banques et stores.</p>
        </div>
        <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
          + Générer un certificat
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border border-border shadow-sm rounded-xl">
            <CardContent>
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              <div className="mt-3 text-3xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>Tableau des certificats</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Banque</th>
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Émis</th>
                <th className="py-3 px-4">Expiration</th>
                <th className="py-3 px-4">Progression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificateRows.map((row) => (
                <tr key={row.id} className="hover:bg-orange-50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-800">{row.bank}</td>
                  <td className="py-4 px-4">{row.store}</td>
                  <td className="py-4 px-4">{row.module}</td>
                  <td className="py-4 px-4">{row.type}</td>
                  <td className="py-4 px-4 flex items-center gap-2 text-gray-600">
                    {row.reference}
                    <Eye className="w-4 h-4 text-gray-400" />
                  </td>
                  <td className="py-4 px-4">{row.issued}</td>
                  <td className="py-4 px-4">{row.expires}</td>
                  <td className="py-4 px-4 w-44">
                    <Progress value={row.status} className="h-2 rounded-full bg-orange-100" />
                    <div className="mt-2 text-xs text-gray-500">{row.status}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
