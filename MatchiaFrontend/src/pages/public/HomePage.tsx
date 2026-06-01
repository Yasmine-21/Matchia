import '../../styles/HomePage.css';
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
  Check,
  Globe,
  Award,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

/* ── Reusable animation variants ─────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

const fadeIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' } }),
};

/* ── Stats data ──────────────────────────────────────────── */
const STATS = [
  { value: '50+', label: 'Banques partenaires', icon: Building2 },
  { value: '3 sem', label: 'Délai de lancement', icon: Clock },
  { value: '99.9%', label: 'Disponibilité SLA', icon: Globe },
  { value: '4.9★', label: 'Satisfaction client', icon: Award },
];

export function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="home-container">

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <div className="home-hero-grid">

            {/* Left column */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <motion.div className="home-hero-badge" variants={fadeUp} custom={0}>
                <Zap className="home-hero-badge-icon" />
                <span className="home-hero-badge-text">La plateforme de marketplace bancaire n°1</span>
              </motion.div>

              <motion.h1 className="home-hero-title" variants={fadeUp} custom={1}>
                Lancez votre marketplace bancaire en quelques jours
              </motion.h1>

              <motion.p className="home-hero-description" variants={fadeUp} custom={2}>
                Matchia est la plateforme SaaS complète qui permet aux banques de lancer des marketplaces financières entièrement personnalisées avec des boutiques modulables et des outils puissants, sans la complexité d'une construction sur mesure.
              </motion.p>

              <motion.div className="home-hero-actions" variants={fadeUp} custom={3}>
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
              </motion.div>

              <motion.div className="home-hero-features" variants={fadeUp} custom={4}>
                {['Carte de crédit non requise', 'Configuration en quelques minutes'].map(f => (
                  <div key={f} className="home-hero-feature-item">
                    <CheckCircle className="home-hero-feature-icon" />
                    <span>{f}</span>
                  </div>
                ))}
              </motion.div>

              {/* Stats row */}
              <motion.div className="home-stats-row" variants={fadeUp} custom={5}>
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="home-stat-item">
                    <div className="home-stat-value">{value}</div>
                    <div className="home-stat-label">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right column — image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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

      {/* ── Qu'est-ce que Matchia ───────────────────────────── */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <motion.div
            className="home-section-header"
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <h2 className="home-section-title">Qu'est-ce que Matchia ?</h2>
            <p className="home-section-subtitle">
              Matchia est une plateforme SaaS multi-locataire qui permet aux banques de créer des marketplaces numériques entièrement personnalisables pour les produits financiers, avec des boutiques modulables, des outils puissants et un contrôle total de la marque.
            </p>
          </motion.div>

          <div className="home-about-grid">
            {[
              { icon: <Building2 className="home-card-icon" />, title: 'SaaS Multi-locataire', desc: 'Chaque banque bénéficie de son propre environnement isolé avec un contrôle total sur l\'image de marque, les utilisateurs et la configuration, le tout géré depuis une plateforme centralisée.' },
              { icon: <Store className="home-card-icon" />, title: 'Marketplaces bancaires', desc: 'Permettez à vos clients d\'explorer des options de financement dans plusieurs catégories (véhicules, mobile, médical, immobilier) avec des outils intégrés comme des simulateurs et des comparateurs.' },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeIn} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="home-card-center" style={{ height: '100%' }}>
                  <CardHeader>
                    <div className="home-card-icon-wrapper">{item.icon}</div>
                    <CardTitle className="home-card-title">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="home-card-description">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Avantages ───────────────────────────────────────── */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <motion.div className="home-section-header" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="home-section-title">Avantages de la plateforme</h2>
            <p className="home-section-subtitle">Tout ce dont vous avez besoin pour lancer et développer votre marketplace bancaire</p>
          </motion.div>

          <div className="home-benefits-grid">
            {[
              { icon: <Building2 className="home-benefit-icon" />, title: 'Architecture multi-locataire', description: 'Environnements complètement isolés pour chaque banque avec des avantages d\'infrastructure partagée.' },
              { icon: <Palette className="home-benefit-icon" />, title: 'Contrôle total de l\'image de marque', description: 'Personnalisez les couleurs, logos, messages et interface utilisateur pour correspondre parfaitement à l\'identité de votre banque.' },
              { icon: <Rocket className="home-benefit-icon" />, title: 'Déploiement instantané', description: 'Lancez votre marketplace en quelques jours, pas en quelques mois. Des modules préconstruits prêts à être activés.' },
              { icon: <Shield className="home-benefit-icon" />, title: 'Sécurité de niveau bancaire', description: 'Sécurité de qualité bancaire avec conformité SOC 2, chiffrement et authentification multi-facteurs.' },
              { icon: <TrendingUp className="home-benefit-icon" />, title: 'Croissance évolutive', description: 'Conçu pour gérer des milliers d\'utilisateurs et de transactions sans dégradation des performances.' },
              { icon: <BarChart3 className="home-benefit-icon" />, title: 'Analytique avancée', description: 'Tableaux de bord et rapports en temps réel pour suivre le comportement des utilisateurs et les métriques de conversion.' },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeIn}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="home-benefit-card">
                  <CardHeader>
                    <div className="home-benefit-icon-wrapper">{benefit.icon}</div>
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

      {/* ── Boutiques & Modules ─────────────────────────────── */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <div className="home-stores-grid">
            {/* Stores */}
            <div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="home-column-title">Boutiques préconstruites</h2>
                <p className="home-column-subtitle">Lancez-vous avec des catégories de financement prêtes à l'emploi</p>
              </motion.div>

              <div className="home-stores-list">
                {[
                  { icon: <Building2 className="home-benefit-icon" />, title: 'Store immobilier', description: 'Prêts immobiliers, financement de projets de construction et crédits logement' },
                  { icon: <Car className="home-benefit-icon" />, title: 'Store véhicules', description: 'Prêts automobiles, options de leasing et solutions de financement de véhicules' },
                  { icon: <Smartphone className="home-benefit-icon" />, title: 'Store mobile', description: 'Plans de financement de téléphones et options de paiement pour appareils mobiles' },
                  { icon: <Heart className="home-benefit-icon" />, title: 'Store médical', description: 'Financement des soins de santé et prêts pour équipements médicaux' },
                ].map((store, i) => (
                  <motion.div key={store.title} variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <Card>
                      <CardHeader>
                        <div className="home-store-card-header">
                          <div className="home-store-card-icon-wrapper">{store.icon}</div>
                          <div>
                            <CardTitle className="home-store-card-title">{store.title}</CardTitle>
                            <CardDescription>{store.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <h2 className="home-column-title">Modules puissants</h2>
                <p className="home-column-subtitle">Améliorez chaque boutique avec des outils interactifs</p>
              </motion.div>

              <div className="home-modules-grid">
                {[
                  { icon: <Calculator className="home-hero-action-icon" />, title: 'Simulateur de prêt', description: 'Calculatrice interactive pour les mensualités' },
                  { icon: <BarChart3 className="home-hero-action-icon" />, title: 'Outil de comparaison', description: 'Comparaisons côte à côte de produits' },
                  { icon: <FileText className="home-hero-action-icon" />, title: 'Blog et contenu', description: 'Articles éducatifs et guides' },
                  { icon: <Target className="home-hero-action-icon" />, title: 'Annonces promotionnelles', description: 'Gestion de campagnes ciblées' },
                  { icon: <Bot className="home-hero-action-icon" />, title: 'Chatbot IA', description: 'Support client intelligent 24h/24 et 7j/7' },
                ].map((module, i) => (
                  <motion.div key={module.title} variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <Card className="home-module-card">
                      <CardHeader className="home-module-card-header">
                        <div className="home-module-card-content">
                          <div className="home-module-card-icon-wrapper">{module.icon}</div>
                          <div>
                            <CardTitle className="home-module-card-title">{module.title}</CardTitle>
                            <CardDescription className="home-module-card-description">{module.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment ça fonctionne ───────────────────────────── */}
      <section className="home-hero-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="home-section-header" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="home-section-title">Comment ça fonctionne</h2>
            <p className="text-lg text-muted-foreground">Cinq étapes simples pour lancer votre marketplace</p>
          </motion.div>

          <div className="home-steps-list">
            {[
              { number: 1, title: 'Demander l\'accès', description: 'Soumettez votre candidature avec les informations de base sur votre banque et vos besoins.' },
              { number: 2, title: 'Obtenir l\'approbation', description: 'Notre équipe examine votre demande et active votre environnement locataire dans les 48 heures.' },
              { number: 3, title: 'Personnaliser l\'image de marque', description: 'Téléchargez votre logo, définissez les couleurs de la marque et personnalisez l\'apparence de votre marketplace.' },
              { number: 4, title: 'Configurer les boutiques', description: 'Sélectionnez les catégories de financement à activer et configurez vos offres de produits.' },
              { number: 5, title: 'Lancer et développer', description: 'Mettez votre marketplace en ligne et commencez à servir vos clients immédiatement.' },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <div className="home-store-card-header">
                      <div className="home-step-number">{step.number}</div>
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

      {/* ── Témoignages ─────────────────────────────────────── */}
      <section className="home-about-section">
        <div className="home-hero-wrapper">
          <motion.div className="home-section-header" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="home-section-title">Approuvé par les grandes banques</h2>
          </motion.div>

          <div className="home-testimonials-grid">
            {[
              { quote: '"Matchia nous a permis de lancer notre marketplace numérique en seulement 3 semaines. La plateforme est robuste, sécurisée et nos clients adorent la nouvelle expérience."', author: 'Ahmed Ben Ali', role: 'Directeur du numérique, Banque Zitouna' },
              { quote: '"La flexibilité et les options de personnalisation sont remarquables. Nous pouvons vraiment la rendre nôtre tout en bénéficiant d\'une infrastructure de qualité bancaire."', author: 'Fatma Gharbi', role: 'PDG, BH Bank' },
            ].map((t, i) => (
              <motion.div key={t.author} variants={fadeIn} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card style={{ height: '100%' }}>
                  <CardContent className="home-testimonial-content">
                    <p className="home-testimonial-quote">{t.quote}</p>
                    <div>
                      <div className="home-testimonial-author">{t.author}</div>
                      <div className="home-testimonial-role">{t.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité ────────────────────────────────────────── */}
      <section className="home-hero-section">
        <div className="home-hero-wrapper">
          <div className="home-hero-grid">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h2 className="home-security-title">Sécurité de qualité bancaire</h2>
              <p className="home-security-subtitle">Construite selon les normes de sécurité bancaire dès le premier jour</p>
              <div className="home-stores-list">
                {[
                  'Conformité SOC 2 Type II',
                  'Chiffrement de bout en bout pour toutes les données',
                  'Authentification multi-facteurs',
                  'Conformité RGPD et confidentialité des données',
                ].map((item, i) => (
                  <motion.div key={item} variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <div className="home-module-card-content home-security-item">
                      <div className="home-security-icon-wrapper">
                        <Check className="home-hero-feature-icon" />
                      </div>
                      <span className="home-security-text">{item}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              className="home-security-image-wrapper"
            >
              <img
                src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=600&fit=crop"
                alt="Sécurité"
                className="home-hero-image"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="home-about-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="home-section-header" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="home-section-title">Foire aux questions</h2>
          </motion.div>

          <div className="home-faq-list">
            {[
              { question: 'Qu\'est-ce que le SaaS multi-locataire ?', answer: 'Le SaaS multi-locataire signifie que plusieurs banques (locataires) partagent la même infrastructure tout en maintenant une isolation complète des données. Chaque banque dispose de son propre environnement dédié, de ses utilisateurs et de sa configuration.' },
              { question: 'Pouvons-nous personnaliser notre marketplace ?', answer: 'Oui ! Vous avez un contrôle total sur l\'image de marque (couleurs, logos, messages), la sélection des boutiques, la configuration des modules et la gestion des utilisateurs. La plateforme est conçue pour donner l\'impression d\'être votre propre produit.' },
              { question: 'Combien de temps faut-il pour lancer ?', answer: 'La plupart des banques sont opérationnelles en 1 à 2 semaines. Une fois approuvé, vous pouvez immédiatement commencer à personnaliser votre environnement et à configurer les boutiques.' },
              { question: 'Que sont les boutiques et les modules ?', answer: 'Les boutiques sont des catégories de financement (Véhicules, Mobile, Médical, etc.). Les modules sont des outils intégrés aux boutiques (Simulateur, Comparateur, Blog, etc.). Vous choisissez ceux à activer.' },
            ].map((faq, index) => (
              <motion.div key={index} variants={fadeUp} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="home-faq-card">
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
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <CardContent className="home-faq-content">
                          <p className="home-card-description">{faq.answer}</p>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}