import { Link } from 'react-router';
import { motion, type Variants } from 'motion/react';
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  HeartPulse,
  LayoutGrid,
  Lock,
  Palette,
  Rocket,
  ShieldCheck,
  Smartphone,
  Store,
  SlidersHorizontal,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: delay * 0.08, ease: 'easeOut' },
  }),
};

const aboutCards = [
  {
    icon: Store,
    title: 'Marketplace bancaire personnalisable',
    description:
      'Offrez à vos clients une expérience bancaire moderne avec un univers visuel adapté à votre image.',
  },
  {
    icon: LayoutGrid,
    title: 'Gestion unifiée et modulaire',
    description:
      'Centralisez les boutiques, les produits et les modules dans une interface claire et évolutive.',
  },
  {
    icon: BarChart3,
    title: 'Pilotage via data et KPI',
    description:
      'Suivez vos performances et vos conversions grâce à des indicateurs simples et exploitables.',
  },
];

const benefits = [
  {
    icon: Palette,
    title: 'Personnalisation de l’image de marque',
    description: 'Logo, couleurs, bannière et message d’accueil alignés avec l’identité de votre banque.',
  },
  {
    icon: Rocket,
    title: 'Déploiement rapide',
    description: 'Une base prête à l’emploi pour lancer votre marketplace en quelques jours.',
  },
  {
    icon: ShieldCheck,
    title: 'Sécurité bancaire',
    description: 'Une architecture pensée pour la conformité, l’isolation et la fiabilité.',
  },
  {
    icon: TrendingUp,
    title: 'Évolutivité',
    description: 'Ajoutez des stores, des produits et des modules sans refondre la plateforme.',
  },
  {
    icon: BarChart3,
    title: 'Pilotage centralisé',
    description: 'Suivez les contenus, les demandes et les performances depuis vos back offices.',
  },
  {
    icon: CircleDollarSign,
    title: 'Analyse et suivi des performances',
    description: 'Mesurez l’usage des parcours et adaptez vos offres selon les résultats observés.',
  },
];

const stores = [
  {
    icon: Smartphone,
    title: 'Store mobile',
    description: 'Financement de téléphones et solutions de paiement adaptées au mobile.',
  },
  {
    icon: Building2,
    title: 'Store immobilier',
    description: 'Parcours dédiés au crédit logement et aux projets d’habitat.',
  },
  {
    icon: HeartPulse,
    title: 'Store medical',
    description: 'Solutions de financement pour les dépenses et équipements médicaux.',
  },
  {
    icon: Activity,
    title: 'Store vehicule',
    description: 'Financement auto, leasing et offres pensées pour les véhicules.',
  },
];

const modules = [
  {
    icon: SlidersHorizontal,
    title: 'Comparateur',
    description: 'Comparer plusieurs produits d’un même store avec leurs caractéristiques.',
  },
  {
    icon: Calculator,
    title: 'Simulateur',
    description: 'Calculer une estimation de mensualité selon les règles bancaires configurées.',
  },
  {
    icon: Bot,
    title: 'Chatbot',
    description: 'Guider les visiteurs et répondre rapidement aux questions clés.',
  },
  {
    icon: FileText,
    title: 'Blog',
    description: 'Publier des contenus éditoriaux pour informer et convertir.',
  },
];

const steps = [
  {
    step: '1',
    title: "Demande d'adhésion",
    description: "Votre banque soumet une demande pour rejoindre l'écosystème Matchia.",
  },
  {
    step: '2',
    title: 'Validation et onboarding',
    description: 'Notre équipe valide votre demande et vous accompagne dans l’onboarding.',
  },
  {
    step: '3',
    title: 'Personnalisation de la marketplace',
    description: 'Personnalisez votre marketplace : identité visuelle, produits, contenus et paramètres.',
  },
  {
    step: '4',
    title: 'Activation des stores et modules',
    description: 'Choisissez et activez les stores ainsi que les modules adaptés à votre stratégie.',
  },
  {
    step: '5',
    title: 'Lancement de la marketplace',
    description: 'Votre marketplace est en ligne. Commencez à servir vos clients.',
  },
];

const choiceCards = [
  {
    icon: Rocket,
    title: 'Lancement rapide',
    description: 'Soyez opérationnel en quelques jours.',
  },
  {
    icon: CircleDollarSign,
    title: 'Offres modulaires',
    description: 'Adaptez uniquement les modules dont vous avez besoin.',
  },
  {
    icon: ShieldCheck,
    title: 'Expérience client optimisée',
    description: 'Offrez une expérience fluide, simple et 100% digitale.',
  },
  {
    icon: LayoutGrid,
    title: 'Conformité réglementaire',
    description: 'Une plateforme conforme avec les standards de sécurité.',
  },
  {
    icon: TrendingUp,
    title: 'Coûts maîtrisés',
    description: 'Optimisez vos coûts avec un modèle SaaS transparent.',
  },
];

const securityItems = [
  'Architecture sécurisée',
  'Conformité et protection',
  'Haute disponibilité',
  'Performance scalable',
];

function DashboardMock() {
  const linePoints = '24,170 64,150 104,158 144,126 184,132 224,94 264,108 304,76 344,94 384,60';

  return (
    <div className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.12)]">
      <div className="grid grid-cols-[220px_1fr]">
        <aside className="hidden bg-slate-950 px-4 py-6 text-white lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Matchia</div>
              <div className="text-xs text-white/60">Tableau de bord</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {['Vue générale', 'Demandes', 'Produits', 'Simulateur', 'Comparateur', 'Blog', 'Paramètres'].map(
              (item, index) => (
                <div
                  key={item}
                  className={`rounded-xl px-3 py-2 ${index === 0 ? 'bg-white/10 text-white' : 'text-white/65'}`}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Tableau de bord</div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Admin banque</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Demandes', value: '4 128', delta: '+16,2%' },
              { label: 'Clients', value: '2 301', delta: '+8,4%' },
              { label: 'Revenu', value: '128 MB', delta: '+12,1%' },
              { label: 'Taux', value: '55,8%', delta: '+4,3%' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{item.value}</div>
                <div className="mt-1 text-xs font-semibold text-emerald-600">{item.delta}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Performance mensuelle</div>
                  <div className="text-xs text-slate-500">Données consolidées</div>
                </div>
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <svg viewBox="0 0 400 210" className="h-48 w-full">
                <defs>
                  <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={`M 24 170 ${linePoints.replace(/ /g, ' L ')}`} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
                <path d={`M 24 170 ${linePoints.replace(/ /g, ' L ')} L 384 170 Z`} fill="url(#lineFill)" />
                <polyline points={linePoints} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {linePoints.split(' ').map((pair) => {
                  const [x, y] = pair.split(',').map(Number);
                  return <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#fff" stroke="#2563eb" strokeWidth="3" />;
                })}
              </svg>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-slate-900">Répartition</div>
              <div
                className="mx-auto flex h-40 w-40 items-center justify-center rounded-full"
                style={{ background: 'conic-gradient(#2563eb 0 62%, #14b8a6 62% 82%, #f59e0b 82% 100%)' }}
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
                  <div className="text-center">
                    <div className="text-xs text-slate-400">Actifs</div>
                    <div className="text-xl font-bold text-slate-900">100%</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Mobile</span>
                  <span>62%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Médical</span>
                  <span>20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Immobilier</span>
                  <span>18%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.42em] text-blue-500">{eyebrow}</div>
      ) : null}
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-base leading-8 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

function SmallIconCard({
  icon: Icon,
  title,
  description,
  accent = 'blue',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const accents = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-violet-50 text-violet-600 border-violet-100',
  };

  return (
    <Card className="h-full border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="mb-3">
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-[1.05rem] font-bold text-slate-950">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  return (
    <div className="bg-[#f7f8fc] text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f4f7ff] via-white to-[#fff6ef] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-8">
            <div className="space-y-5">
              <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-[3.7rem] lg:leading-[1.08]">
                Lancez votre <span className="text-blue-600">marketplace bancaire</span> en quelques jours
              </h1>
              <p className="max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Matchia est la plateforme digitale de financement qui permet aux banques de lancer rapidement leur
                marketplace multi-produits et d’offrir une expérience unifiée, sécurisée et performante à leurs
                clients.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/rejoindre">
                <Button
                  size="lg"
                  className="bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] hover:bg-blue-700"
                >
                  Demander une démo
                </Button>
              </Link>
              <Link to="/rejoindre">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-white shadow-[0_9px_20px_rgba(249,115,22,0.22)]"
                >
                  Rejoindre Matchia
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="relative">
            <DashboardMock />
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="Qu’est-ce que Matchia ?"
            subtitle="Matchia combine l’architecture SaaS, la modularité métier et une expérience bancaire moderne pour lancer des marketplaces financières performantes."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {aboutCards.map((item, index) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={index}
              >
                <SmallIconCard icon={item.icon} title={item.title} description={item.description} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fc] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Avantages"
            title="Avantages pour votre banque"
            subtitle="Une base solide pour lancer, piloter et faire évoluer votre marketplace bancaire."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={index}
              >
                <Card className="h-full border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-1">
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <benefit.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-950">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-slate-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="Stores"
                title="Stores disponibles"
                subtitle="Les boutiques reflètent les catégories de financement actives de votre marketplace."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {stores.map((store, index) => (
                  <motion.div
                    key={store.title}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={index}
                  >
                    <SmallIconCard
                      icon={store.icon}
                      title={store.title}
                      description={store.description}
                      accent={index === 0 ? 'blue' : index === 1 ? 'green' : index === 2 ? 'orange' : 'purple'}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="Modules"
                title="Modules disponibles"
                subtitle="Les quatre modules visibles dans la maquette : comparateur, simulateur, chatbot et blog."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((module, index) => (
                  <motion.div
                    key={module.title}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={index}
                  >
                    <SmallIconCard
                      icon={module.icon}
                      title={module.title}
                      description={module.description}
                      accent={index === 0 ? 'blue' : index === 1 ? 'orange' : index === 2 ? 'green' : 'purple'}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Comment ça fonctionne ?</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {steps.map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                  {item.step}
                </div>
                <div className="mb-3 hidden h-px w-full border-t border-dashed border-blue-200 xl:block" />
                <h3 className="mb-2 text-sm font-bold text-slate-950">{item.title}</h3>
                <p className="mx-auto max-w-[220px] text-sm leading-6 text-slate-500">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fc] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <Users className="h-4 w-4" />
                Pourquoi les banques choisissent Matchia
              </div>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Pourquoi les banques
                <br />
                choisissent Matchia
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                Rejoignez une communauté de banques qui ont fait le choix d’innover et de se différencier avec une
                marketplace performante.
              </p>
              <div className="mt-6">
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                  Rejoindre Matchia
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {choiceCards.map((item) => (
                <Card
                  key={item.title}
                  className="h-full border-slate-200 bg-white px-4 py-5 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <CardHeader className="mb-2">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-950">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-6 text-slate-500">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-950">
              <Lock className="h-6 w-6 text-blue-600" />
              Sécurité et qualité bancaire
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {securityItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item}</div>
                    <div className="mt-1 text-xs leading-6 text-slate-500">
                      {item === 'Architecture sécurisée'
                        ? 'Hébergement en Europe avec des standards élevés.'
                        : item === 'Conformité et protection'
                          ? 'RGPD, DSP2 et mesures avancées de protection des données.'
                          : item === 'Haute disponibilité'
                            ? 'Infrastructure redondante pour une continuité maximale.'
                            : 'Technologie cloud optimisée pour accompagner votre croissance.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
