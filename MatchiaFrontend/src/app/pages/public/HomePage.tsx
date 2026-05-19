import '../../../styles/HomePage.css';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  ArrowRight,
  Building2,
  Store,
  Shield,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  Lock,
  BarChart3,
  Palette,
  Rocket,
  Settings,
  Calculator,
  FileText,
  Target,
  Bot,
  Car,
  Smartphone,
  Heart,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="home-container">
      {/* Section Héro */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <div className="home-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="home-hero-badge">
                <Zap className="home-hero-badge-icon" />
                <span className="home-hero-badge-text">La plateforme de marketplace bancaire n°1</span>
              </div>
              <h1 className="home-hero-title">
                Lancez votre marketplace bancaire en quelques jours
              </h1>
              <p className="home-hero-description">
                Matchia est la plateforme SaaS complète qui permet aux banques de lancer des marketplaces financières entièrement personnalisées avec des boutiques modulables et des outils puissants, sans la complexité d'une construction sur mesure.
              </p>
              <div className="home-hero-actions">
                <Link to="/banques">
                  <Button size="lg" variant="secondary" icon={<Store className="home-hero-action-icon" />}>
                    Explorer les banques
                  </Button>
                </Link>
                <Link to="/rejoindre">
                  <Button size="lg" variant="outline" icon={<ArrowRight className="home-hero-action-icon" />}>
                    Demander une démo
                  </Button>
                </Link>
              </div>
              <div className="home-hero-features">
                <div className="home-hero-feature-item">
                  <CheckCircle className="home-hero-feature-icon" />
                  <span>Carte de crédit non requise</span>
                </div>
                <div className="home-hero-feature-item">
                  <CheckCircle className="home-hero-feature-icon" />
                  <span>Configuration en quelques minutes</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="home-hero-image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop"
                  alt="Tableau de bord Matchia"
                  className="home-hero-image"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section Qu'est-ce que Matchia */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <div className="home-section-header">
            <h2 className="home-section-title">Qu'est-ce que Matchia ?</h2>
            <p className="home-section-subtitle">
              Matchia est une plateforme SaaS multi-locataire qui permet aux banques de créer des marketplaces numériques entièrement personnalisables pour les produits financiers, avec des boutiques modulables, des outils puissants et un contrôle total de la marque.
            </p>
          </div>

          <div className="home-about-grid">
            <Card className="home-card-center">
              <CardHeader>
                <div className="home-card-icon-wrapper">
                  <Building2 className="home-card-icon" />
                </div>
                <CardTitle className="home-card-title">SaaS Multi-locataire</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="home-card-description">
                  Chaque banque bénéficie de son propre environnement isolé avec un contrôle total sur l'image de marque, les utilisateurs et la configuration, le tout géré depuis une plateforme centralisée.
                </p>
              </CardContent>
            </Card>

            <Card className="home-card-center">
              <CardHeader>
                <div className="home-card-icon-wrapper">
                  <Store className="home-card-icon" />
                </div>
                <CardTitle className="home-card-title">Marketplaces bancaires</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="home-card-description">
                  Permettez à vos clients d'explorer des options de financement dans plusieurs catégories (véhicules, mobile, médical, immobilier) avec des outils intégrés comme des simulateurs et des comparateurs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Avantages de la plateforme */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <div className="home-section-header">
            <h2 className="home-section-title">Avantages de la plateforme</h2>
            <p className="text-lg text-muted-foreground">
              Tout ce dont vous avez besoin pour lancer et développer votre marketplace bancaire
            </p>
          </div>

          <div className="home-benefits-grid">
            {[
              {
                icon: <Building2 className="home-benefit-icon" />,
                title: 'Architecture multi-locataire',
                description: 'Environnements complètement isolés pour chaque banque avec des avantages d\'infrastructure partagée.'
              },
              {
                icon: <Palette className="home-benefit-icon" />,
                title: 'Contrôle total de l\'image de marque',
                description: 'Personnalisez les couleurs, logos, messages et interface utilisateur pour correspondre parfaitement à l\'identité de votre banque.'
              },
              {
                icon: <Rocket className="home-benefit-icon" />,
                title: 'Déploiement instantané',
                description: 'Lancez votre marketplace en quelques jours, pas en quelques mois. Des modules préconstruits prêts à être activés.'
              },
              {
                icon: <Shield className="home-benefit-icon" />,
                title: 'Sécurité de niveau bancaire',
                description: 'Sécurité de qualité bancaire avec conformité SOC 2, chiffrement et authentification multi-facteurs.'
              },
              {
                icon: <TrendingUp className="home-benefit-icon" />,
                title: 'Croissance évolutive',
                description: 'Conçu pour gérer des milliers d\'utilisateurs et de transactions sans dégradation des performances.'
              },
              {
                icon: <BarChart3 className="home-benefit-icon" />,
                title: 'Analytique avancée',
                description: 'Tableaux de bord et rapports en temps réel pour suivre le comportement des utilisateurs et les métriques de conversion.'
              }
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="home-benefit-card">
                  <CardHeader>
                    <div className="home-benefit-icon-wrapper">
                      {benefit.icon}
                    </div>
                    <CardTitle>{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="home-card-description">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Boutiques et modules */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <div className="home-stores-grid">
            {/* Boutiques préconstruites */}
            <div>
              <h2 className="home-column-title">Boutiques préconstruites</h2>
              <p className="home-column-subtitle">
                Lancez-vous avec des catégories de financement prêtes à l'emploi
              </p>

              <div className="home-stores-list">
                {[
                  {
                   icon: <Building2 className="home-benefit-icon" />, // Utilise Building2 pour l'immobilier
                   title: 'Store immobilier',
                   description: 'Prêts immobiliers, financement de projets de construction et crédits logement'
           },
                  {
                    icon: <Car className="home-benefit-icon" />,
                    title: 'Store véhicules',
                    description: 'Prêts automobiles, options de leasing et solutions de financement de véhicules'
                  },
                  {
                    icon: <Smartphone className="home-benefit-icon" />,
                    title: 'Store mobile',
                    description: 'Plans de financement de téléphones et options de paiement pour appareils mobiles'
                  },
                  {
                    icon: <Heart className="home-benefit-icon" />,
                    title: 'Store médical',
                    description: 'Financement des soins de santé et prêts pour équipements médicaux'
                  }
                ].map((store) => (
                  <Card key={store.title}>
                    <CardHeader>
                      <div className="home-store-card-header">
                        <div className="home-store-card-icon-wrapper">
                          {store.icon}
                        </div>
                        <div>
                          <CardTitle className="home-store-card-title">{store.title}</CardTitle>
                          <CardDescription>{store.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* Modules puissants */}
            <div>
              <h2 className="home-column-title">Modules puissants</h2>
              <p className="home-column-subtitle">
                Améliorez chaque boutique avec des outils interactifs
              </p>

              <div className="home-modules-grid">
                {[
                  {
                    icon: <Calculator className="home-hero-action-icon" />,
                    title: 'Simulateur de prêt',
                    description: 'Calculatrice interactive pour les mensualités'
                  },
                  {
                    icon: <BarChart3 className="home-hero-action-icon" />,
                    title: 'Outil de comparaison',
                    description: 'Comparaisons côte à côte de produits'
                  },
                  {
                    icon: <FileText className="home-hero-action-icon" />,
                    title: 'Blog et contenu',
                    description: 'Articles éducatifs et guides'
                  },
                  {
                    icon: <Target className="home-hero-action-icon" />,
                    title: 'Annonces promotionnelles',
                    description: 'Gestion de campagnes ciblées'
                  },
                  {
                    icon: <Bot className="home-hero-action-icon" />,
                    title: 'Chatbot IA',
                    description: 'Support client intelligent 24h/24 et 7j/7'
                  }
                ].map((module) => (
                  <Card key={module.title} className="home-module-card">
                    <CardHeader className="home-module-card-header">
                      <div className="home-module-card-content">
                        <div className="home-module-card-icon-wrapper">
                          {module.icon}
                        </div>
                        <div>
                          <CardTitle className="home-module-card-title">{module.title}</CardTitle>
                          <CardDescription className="home-module-card-description">{module.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça fonctionne */}
      <section className="home-hero-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="home-section-header">
            <h2 className="home-section-title">Comment ça fonctionne</h2>
            <p className="text-lg text-muted-foreground">
              Cinq étapes simples pour lancer votre marketplace
            </p>
          </div>

          <div className="home-steps-list">
            {[
              {
                number: 1,
                title: 'Demander l\'accès',
                description: 'Soumettez votre candidature avec les informations de base sur votre banque et vos besoins.'
              },
              {
                number: 2,
                title: 'Obtenir l\'approbation',
                description: 'Notre équipe examine votre demande et active votre environnement locataire dans les 48 heures.'
              },
              {
                number: 3,
                title: 'Personnaliser l\'image de marque',
                description: 'Téléchargez votre logo, définissez les couleurs de la marque et personnalisez l\'apparence de votre marketplace.'
              },
              {
                number: 4,
                title: 'Configurer les boutiques',
                description: 'Sélectionnez les catégories de financement à activer et configurez vos offres de produits.'
              },
              {
                number: 5,
                title: 'Lancer et développer',
                description: 'Mettez votre marketplace en ligne et commencez à servir vos clients immédiatement.'
              }
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <div className="home-store-card-header">
                      <div className="home-step-number">
                        {step.number}
                      </div>
                      <div className="home-step-content">
                        <CardTitle className="home-store-card-title">{step.title}</CardTitle>
                        <CardDescription className="home-module-card-title">{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <div className="home-section-header">
            <h2 className="home-section-title">Approuvé par les grandes banques</h2>
          </div>

          <div className="home-testimonials-grid">
            <Card>
              <CardContent className="home-testimonial-content">
                <p className="home-testimonial-quote">
                  "Matchia nous a permis de lancer notre marketplace numérique en seulement 3 semaines. La plateforme est robuste, sécurisée et nos clients adorent la nouvelle expérience."
                </p>
                <div>
                  <div className="home-testimonial-author">Ahmed Ben Ali</div>
                  <div className="home-testimonial-role">Directeur du numérique, Banque Zitouna</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="home-testimonial-content">
                <p className="home-testimonial-quote">
                  "La flexibilité et les options de personnalisation sont remarquables. Nous pouvons vraiment la rendre nôtre tout en bénéficiant d'une infrastructure de qualité bancaire."
                </p>
                <div>
                  <div className="home-testimonial-author">Fatma Gharbi</div>
                  <div className="home-testimonial-role">PDG, BH Bank</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section Sécurité */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <div className="home-hero-grid">
            <div>
              <h2 className="home-security-title">Sécurité de qualité bancaire</h2>
              <p className="home-security-subtitle">
                Construite selon les normes de sécurité bancaire dès le premier jour
              </p>
              <div className="home-stores-list">
                {[
                  'Conformité SOC 2 Type II',
                  'Chiffrement de bout en bout pour toutes les données',
                  'Authentification multi-facteurs',
                  'Conformité RGPD et confidentialité des données'
                ].map((item) => (
                  <div key={item} className="home-module-card-content">
                    <div className="home-security-icon-wrapper">
                      <Check className="home-hero-feature-icon" />
                    </div>
                    <span className="home-security-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="home-security-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=600&fit=crop"
                alt="Sécurité"
                className="home-hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section className="home-about-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="home-section-header">
            <h2 className="home-section-title">Foire aux questions</h2>
          </div>

          <div className="home-faq-list">
            {[
              {
                question: 'Qu\'est-ce que le SaaS multi-locataire ?',
                answer: 'Le SaaS multi-locataire signifie que plusieurs banques (locataires) partagent la même infrastructure tout en maintenant une isolation complète des données. Chaque banque dispose de son propre environnement dédié, de ses utilisateurs et de sa configuration.'
              },
              {
                question: 'Pouvons-nous personnaliser notre marketplace ?',
                answer: 'Oui ! Vous avez un contrôle total sur l\'image de marque (couleurs, logos, messages), la sélection des boutiques, la configuration des modules et la gestion des utilisateurs. La plateforme est conçue pour donner l\'impression d\'être votre propre produit.'
              },
              {
                question: 'Combien de temps faut-il pour lancer ?',
                answer: 'La plupart des banques sont opérationnelles en 1 à 2 semaines. Une fois approuvé, vous pouvez immédiatement commencer à personnaliser votre environnement et à configurer les boutiques.'
              },
              {
                question: 'Que sont les boutiques et les modules ?',
                answer: 'Les boutiques sont des catégories de financement (Véhicules, Mobile, Médical, etc.). Les modules sont des outils intégrés aux boutiques (Simulateur, Comparateur, Blog, etc.). Vous choisissez ceux à activer.'
              }
            ].map((faq, index) => (
              <Card key={index} className="home-faq-card">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="home-faq-button"
                >
                  <CardHeader className="home-faq-header">
                    <CardTitle className="home-module-card-title">{faq.question}</CardTitle>
                    <ChevronDown
                      className={`home-faq-icon ${openFaq === index ? 'home-faq-icon-rotated' : ''}`}
                    />
                  </CardHeader>
                </button>
                {openFaq === index && (
                  <CardContent className="home-faq-content">
                    <p className="home-card-description">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>
     
    </div>
  );
}