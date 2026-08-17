import '../../styles/BanksPage.css';
import '../../styles/DealersPage.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Building2, Loader2, Mail, MapPin, Phone, Search, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import apiClient from '../../api/apiClient';
import { PublicDealer, publicDealerService } from '../../services/publicDealerService';

const getLogoUrl = (logoUrl?: string | null) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http') || logoUrl.startsWith('data:')) return logoUrl;
  const baseUrl = (apiClient.defaults.baseURL || 'http://localhost:8081').replace(/\/$/, '');
  return `${baseUrl}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
};

function DealerLogo({ dealer }: { dealer: PublicDealer }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = hasError ? null : getLogoUrl(dealer.logoUrl);

  useEffect(() => setHasError(false), [dealer.logoUrl]);

  if (!logoUrl) {
    return (
      <div className="banks-card-logo banks-logo-fallback">
        <Building2 className="banks-logo-fallback-icon" />
      </div>
    );
  }

  return (
    <img
      className="banks-card-logo"
      src={logoUrl}
      alt={`Logo ${dealer.companyName}`}
      onError={() => setHasError(true)}
    />
  );
}

export function DealersPage() {
  const [dealers, setDealers] = useState<PublicDealer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    publicDealerService.getActiveDealers()
      .then((data) => {
        if (active) setDealers(data);
      })
      .catch((requestError) => {
        console.error('Impossible de charger les concessionnaires actifs.', requestError);
        if (active) setError('Impossible de charger les concessionnaires pour le moment.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr');
  const filteredDealers = dealers.filter((dealer) => {
    if (!normalizedSearch) return true;
    return [dealer.companyName, dealer.storeName, dealer.storeDescription, dealer.address]
      .some((value) => value?.toLocaleLowerCase('fr').includes(normalizedSearch));
  });

  return (
    <div className="banks-container">
      <section className="banks-hero-section">
        <div className="banks-wrapper">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="banks-header">
            <h1 className="banks-title">Concessionnaires</h1>
            <p className="banks-subtitle">
              Découvrez les concessionnaires partenaires présents sur Matchia.
            </p>
          </motion.div>

          <div className="dealers-hero-actions">
            <div className="banks-search-input">
              <Input
                placeholder="Rechercher un concessionnaire ou un store..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <Link to="/devenir-concessionnaire">
              <Button variant="secondary" className="dealers-partner-button">
                Devenir partenaire
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="banks-list-section">
        <div className="banks-wrapper">
          {isLoading && (
            <div className="dealers-state" role="status">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p>Chargement des concessionnaires...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="dealers-state dealers-error" role="alert">
              <Building2 className="h-10 w-10" />
              <p>{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
            </div>
          )}

          {!isLoading && !error && filteredDealers.length > 0 && (
            <div className="banks-grid">
              {filteredDealers.map((dealer, index) => (
                <motion.div
                  key={`${dealer.companyName}-${dealer.email || dealer.storeName}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Card hover className="banks-card dealers-card">
                    <CardHeader>
                      <div className="banks-card-header">
                        <DealerLogo dealer={dealer} />
                        <div className="banks-search-input">
                          <CardTitle className="banks-card-title">{dealer.companyName}</CardTitle>
                          <div className="banks-card-location">
                            <Store className="banks-icon" />
                            {dealer.storeName}
                          </div>
                        </div>
                      </div>
                      {dealer.storeDescription && (
                        <CardDescription className="banks-card-desc">
                          {dealer.storeDescription}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="dealers-contact-list">
                      {dealer.email && (
                        <a href={`mailto:${dealer.email}`} className="dealers-contact-row">
                          <Mail className="banks-icon" /><span>{dealer.email}</span>
                        </a>
                      )}
                      {dealer.phone && (
                        <a href={`tel:${dealer.phone}`} className="dealers-contact-row">
                          <Phone className="banks-icon" /><span>{dealer.phone}</span>
                        </a>
                      )}
                      {dealer.address && (
                        <div className="dealers-contact-row">
                          <MapPin className="banks-icon" /><span>{dealer.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && !error && filteredDealers.length === 0 && (
            <div className="banks-empty-state">
              <div className="banks-empty-icon-wrapper">
                <Building2 className="banks-empty-icon" />
              </div>
              <h3 className="banks-empty-title">
                {searchTerm ? 'Aucun concessionnaire trouvé' : 'Aucun concessionnaire actif'}
              </h3>
              <p className="banks-results-count">
                {searchTerm ? 'Essayez de modifier votre recherche.' : 'Les concessionnaires actifs apparaîtront ici.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="banks-cta-section">
        <div className="banks-cta-wrapper">
          <h2 className="banks-cta-title">Vous souhaitez rejoindre le réseau Matchia ?</h2>
          <p className="banks-cta-subtitle">
            Présentez votre activité et créez votre espace concessionnaire partenaire.
          </p>
          <Link to="/devenir-concessionnaire">
            <Button size="lg" variant="secondary">Devenir partenaire</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
