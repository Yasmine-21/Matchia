import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Check } from 'lucide-react';

const offers = [
  { name: 'Basic', price: 1200, modules: ['Simulateur', 'Comparateur', 'Blog'], stores: 2, users: 10, apiCalls: 1000, color: 'gray' },
  { name: 'Premium', price: 3500, modules: ['Tous les 5 modules'], stores: 4, users: 50, apiCalls: 10000, color: 'blue', recommended: true },
  { name: 'Enterprise', price: 'Sur mesure', modules: ['Tous les modules'], stores: 'Illimité', users: 'Illimité', apiCalls: 'Illimité', color: 'indigo' },
];

const subscriptions = [
  { id: 1, bank: 'Zitouna Bank', logo: '🏦', plan: 'Premium', startDate: '15/01/2026', expirationDate: '15/06/2026', daysRemaining: 64, autoRenewal: true, status: 'active' },
  { id: 2, bank: 'BH Bank', logo: '🏛️', plan: 'Enterprise', startDate: '20/02/2026', expirationDate: '20/02/2027', daysRemaining: 314, autoRenewal: true, status: 'active' },
  { id: 3, bank: 'BIAT', logo: '🏢', plan: 'Premium', startDate: '10/03/2026', expirationDate: '20/04/2026', daysRemaining: 8, autoRenewal: false, status: 'expiring' },
];

export function OffersAndSubscriptions() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Offres et Abonnements</h2>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div
            key={offer.name}
            className={`bg-surface rounded-xl border-2 shadow-sm overflow-hidden ${offer.recommended ? 'border-primary shadow-lg relative' : 'border-border'
              }`}
          >
            {offer.recommended && (
              <div className="absolute top-4 right-4">
                <Badge variant="primary">Recommandé</Badge>
              </div>
            )}
            <div className={`px-6 py-8 ${offer.color === 'gray' ? 'bg-gray-50' : offer.color === 'blue' ? 'bg-blue-50' : 'bg-indigo-50'}`}>
              <h3 className="text-2xl font-bold text-foreground mb-2">{offer.name}</h3>
              <div className="text-3xl font-bold text-foreground">
                {typeof offer.price === 'number' ? `${offer.price.toLocaleString()} TND` : offer.price}
                {typeof offer.price === 'number' && <span className="text-base font-normal text-muted-foreground">/mois</span>}
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">
                    {Array.isArray(offer.modules) ? offer.modules.join(', ') : offer.modules}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{offer.stores} stores maximum</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{offer.users} utilisateurs</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{offer.apiCalls} appels API/mois</span>
                </div>
                {offer.name === 'Enterprise' && (
                  <>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">Support prioritaire</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">SLA garanti</span>
                    </div>
                  </>
                )}
              </div>
              <Button variant={offer.recommended ? 'primary' : 'outline'} className="w-full">
                Modifier
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Abonnements</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Banque</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date Début</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Jours Restants</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Auto-renouvellement</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sub.logo}</span>
                      <span className="text-sm font-medium text-foreground">{sub.bank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={sub.plan === 'Enterprise' ? 'indigo' : 'blue'}>{sub.plan}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{sub.startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{sub.expirationDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full max-w-[120px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${sub.daysRemaining < 15 ? 'text-error' :
                            sub.daysRemaining < 60 ? 'text-warning' : 'text-success'
                          }`}>
                          {sub.daysRemaining}j
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${sub.daysRemaining < 15 ? 'bg-error' :
                              sub.daysRemaining < 60 ? 'bg-warning' : 'bg-success'
                            }`}
                          style={{ width: `${Math.min(100, (sub.daysRemaining / 90) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={sub.autoRenewal} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'expiring' ? 'red' : 'gray'}>
                      {sub.status === 'active' ? 'Actif' : sub.status === 'expiring' ? 'Expirant bientôt' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">Renouveler</Button>
                      <Button size="sm" variant="ghost">Upgrader</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
