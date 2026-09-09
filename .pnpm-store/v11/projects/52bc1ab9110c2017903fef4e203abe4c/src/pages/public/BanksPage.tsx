import '../../styles/BanksPage.css';
import { useState, useEffect } from 'react'; 
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Search, MapPin, Store, Grid, List, ExternalLink, Loader2, Building2 } from 'lucide-react';
import { motion } from 'motion/react';


import { bankService } from '../../services/bankService';
import { Bank } from '../../types';
import { resolveApiUrl } from '../../api/apiClient';
import { getMarketplaceUrl } from '../../utils/tenant';

const getLogoUrl = (logoUrl?: string | null) => resolveApiUrl(logoUrl) || null;

const BankLogo = ({ bank, variant = 'card' }: { bank: Bank; variant?: 'card' | 'list' }) => {
  const [hasError, setHasError] = useState(false);
  const logoSrc = !hasError ? getLogoUrl(bank.logoUrl) : null;
  const className = variant === 'list' ? 'banks-list-card-logo' : 'banks-card-logo';

  useEffect(() => {
    setHasError(false);
  }, [bank.logoUrl]);

  if (!logoSrc) {
    return (
      <div className={`${className} banks-logo-fallback`}>
        <Building2 className="banks-logo-fallback-icon" />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={bank.name}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export function BanksPage() {
  
  const [banks, setBanks] = useState<Bank[]>([]); // Liste venant de la DB
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // CHARGEMENT DES DONNÉES DEPUIS LE BACKEND
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setIsLoading(true);
        const data = await bankService.getAllBanks();
        setBanks(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des banques:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanks();
  }, []);

  // LOGIQUE DE FILTRE
  const filteredBanks = banks.filter(bank => {
    const isActive = String(bank.status || '').toLowerCase() === 'active';
    const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bank.description.toLowerCase().includes(searchTerm.toLowerCase());
    return isActive && matchesSearch;
  });

  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-2" />
        <p>Connexion au serveur Matchia...</p>
      </div>
    );
  }

  return (
    <div className="banks-container">
      <section className="banks-hero-section">
        <div className="banks-wrapper">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="banks-header"
          >
            <h1 className="banks-title">Banques partenaires</h1>
            <p className="banks-subtitle">
              Découvrez les institutions financières qui font confiance à Matchia pour leur marketplace de financement
            </p>
          </motion.div>

          <div className="banks-search-container">
            <div className="banks-search-input">
              <Input
                placeholder="Rechercher une banque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="banks-view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={`banks-toggle-btn ${viewMode === 'grid' ? 'banks-toggle-btn-active' : ''}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`banks-toggle-btn ${viewMode === 'list' ? 'banks-toggle-btn-active' : ''}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="banks-list-section">
        <div className="banks-wrapper">
          
          {viewMode === 'grid' ? (
            <div className="banks-grid">
              {filteredBanks.map((bank, index) => (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card hover className="banks-card">
                    <CardHeader>
                      <div className="banks-card-header">
                        <BankLogo bank={bank} />
                        <div className="banks-search-input">
                          <CardTitle className="banks-card-title">{bank.name}</CardTitle>
                          <div className="banks-card-location">
                            <MapPin className="banks-icon" />
                            {bank.country}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="banks-card-desc">
                        {bank.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="banks-search-input">
                      <div className="banks-card-metrics">
                        <div className="banks-metric-box">
                          <div className="banks-metric-label">
                            <Store className="banks-icon" />
                            <span className="banks-text-xs">Depuis</span>
                          </div>
                          <div className="banks-font-semibold">{bank.establishedYear}</div> {/* Corrigé : established_year -> establishedYear */}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <a href={getMarketplaceUrl(bank.slug, '/')} className="banks-search-input" style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
                        <Button variant="secondary" className="banks-full-width" icon={<ExternalLink className="banks-icon" />}>
                          Voir la marketplace
                        </Button>
                      </a>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="banks-list-view">
              {filteredBanks.map((bank, index) => (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card hover className="banks-list-card">
                    <BankLogo bank={bank} variant="list" />
                    <div className="banks-search-input">
                      <div className="banks-list-card-header">
                        <div>
                          <h3 className="banks-list-card-title">{bank.name}</h3>
                          <div className="banks-list-card-stats">
                            <div className="banks-card-rating">
                              <MapPin className="banks-icon" />
                              {bank.country}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="banks-list-card-desc">{bank.description}</p>
                      <div className="banks-list-card-footer">
                       
                        <div>Établie en {bank.establishedYear}</div>
                      </div>
                    </div>
                    <a href={getMarketplaceUrl(bank.slug, '/')} style={{ textDecoration: 'none' }}>
                      <Button variant="secondary" icon={<ExternalLink className="banks-icon" />}>
                        Voir la marketplace
                      </Button>
                    </a>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {filteredBanks.length === 0 && (
            <div className="banks-empty-state">
              <div className="banks-empty-icon-wrapper">
                <Search className="banks-empty-icon" />
              </div>
              <h3 className="banks-empty-title">Aucune banque trouvée</h3>
              <p className="banks-results-count">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="banks-cta-section">
        <div className="banks-cta-wrapper">
          <h2 className="banks-cta-title">Votre banque n'est pas encore sur Matchia ?</h2>
          <p className="banks-cta-subtitle">
            Découvrez comment rejoindre notre réseau de banques innovantes
          </p>
          <Link to="/rejoindre">
            <Button size="lg" variant="secondary">Rejoindre Matchia</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
