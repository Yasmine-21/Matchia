import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { motion } from 'motion/react';
import { BANNER_FRAME_CLASS } from '../../config/banner';
import {
  ArrowRight,
  CircleCheck,
  ShieldCheck,
  UsersRound,
  Zap,
} from 'lucide-react';

type StoreLike = {
  id: string;
  label?: string;
  name?: string;
  slug?: string;
  description?: string;
};

type MarketplaceHomeContext = {
  bankData: {
    name: string;
    stores: StoreLike[];
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    homepage_title: string;
    welcome_text: string;
    banner_image_url?: string;
  };
};

type StoreCardMeta = {
  iconColor: string;
  cardBackground: string;
  cardBorder: string;
  illustration?: string;
};

const getStoreMeta = (store: StoreLike): StoreCardMeta => {
  const raw = `${store.label || store.name || ''}`.toLowerCase();

  if (raw.includes('mobile') || raw.includes('smart')) {
    return {
      iconColor: '#9b4de3',
      cardBackground: '#fbf8ff',
      cardBorder: '#efe5ff',
      illustration: '/images/store-cards/mobile.png',
    };
  }

  if (raw.includes('medical') || raw.includes('médical') || raw.includes('sant')) {
    return {
      iconColor: '#8b5cf6',
      cardBackground: '#fcfaff',
      cardBorder: '#eee5ff',
      illustration: '/images/store-cards/medical.png',
    };
  }

  if (raw.includes('vehicle') || raw.includes('vehicule') || raw.includes('auto') || raw.includes('car')) {
    return {
      iconColor: '#14b8a6',
      cardBackground: '#f5fffc',
      cardBorder: '#dcf5ed',
      illustration: '/images/store-cards/vehicule.png',
    };
  }

  if (raw.includes('education') || raw.includes('edu') || raw.includes('school') || raw.includes('study')) {
    return {
      iconColor: '#60a5fa',
      cardBackground: '#f7fbff',
      cardBorder: '#e0efff',
    };
  }

  if (raw.includes('immobil') || raw.includes('logement') || raw.includes('habitat')) {
    return {
      iconColor: '#f59e0b',
      cardBackground: '#fffaf3',
      cardBorder: '#ffebcc',
      illustration: '/images/store-cards/immobilier.png',
    };
  }

  if (raw.includes('yasmine') || raw.includes('personnel') || raw.includes('person')) {
    return {
      iconColor: '#f472b6',
      cardBackground: '#fff8fb',
      cardBorder: '#ffe3ee',
    };
  }

  return {
    iconColor: '#d97706',
    cardBackground: '#fffaf3',
    cardBorder: '#ffebcc',
  };
};

const formatStoreSlug = (store: StoreLike) => store.slug || store.name || store.id;

const formatStoreName = (store: StoreLike) => {
  const value = store.label || store.name || 'Store';
  const normalized = value.toLocaleLowerCase('fr-FR');

  if (normalized === 'medical' || normalized === 'médical') return 'Médical';
  if (normalized === 'vehicule' || normalized === 'véhicule') return 'Véhicule';
  if (normalized === 'immobilier') return 'Immobilier';
  if (normalized === 'mobile') return 'Mobile';

  return `${value.charAt(0).toLocaleUpperCase('fr-FR')}${value.slice(1)}`;
};

export function MarketplaceHome() {
  const { bankData, branding } = useOutletContext<MarketplaceHomeContext>();

  const featuredStores = useMemo(() => bankData.stores.map((store, index) => ({
    ...store,
    meta: getStoreMeta(store),
    delay: index * 0.08,
  })), [bankData.stores]);

  const storesGridClass = featuredStores.length === 1
    ? 'max-w-[360px] grid-cols-1'
    : featuredStores.length === 2
      ? 'max-w-[760px] grid-cols-1 sm:grid-cols-2'
      : 'max-w-[1440px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="bg-[#f8f6f2]">
      <section className={`relative overflow-hidden bg-[#f7fdf9] ${BANNER_FRAME_CLASS}`}>
        <div className="pointer-events-none absolute -left-10 top-1/3 h-32 w-32 rotate-45 rounded-[34px] bg-emerald-100/55" />
        <div className="pointer-events-none absolute -right-10 bottom-4 h-36 w-36 rotate-45 rounded-[38px] bg-emerald-100/50" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="absolute inset-y-0 right-0 w-full opacity-20 sm:w-[62%] sm:opacity-100"
        >
          <svg className="h-full w-full" viewBox="0 0 1000 340" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="marketplace-banner-divider">
                <path d="M210 0 C140 0 105 45 105 95 C105 124 120 145 145 165 L250 260 C284 290 266 320 218 340 H1000 V0 Z" />
              </clipPath>
              <linearGradient id="marketplace-divider-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={branding.primary_color} />
                <stop offset="100%" stopColor={branding.secondary_color} />
              </linearGradient>
            </defs>
            <foreignObject width="1000" height="340" clipPath="url(#marketplace-banner-divider)">
              <div
                style={
                  branding.banner_image_url
                    ? {
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${branding.banner_image_url})`,
                        backgroundSize: 'auto 175%',
                        backgroundPosition: 'center top',
                      }
                    : {
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`,
                      }
                }
              />
            </foreignObject>
            <path
              d="M210 0 C140 0 105 45 105 95 C105 124 120 145 145 165 L250 260 C284 290 266 320 218 340"
              fill="none"
              stroke="white"
              strokeWidth="6"
            />
            <rect
              x="73"
              y="150"
              width="114"
              height="114"
              rx="27"
              fill="#e6f7e9"
              opacity="0.88"
              transform="rotate(45 130 207)"
            />
            <rect
              x="132"
              y="182"
              width="104"
              height="104"
              rx="26"
              fill="url(#marketplace-divider-accent)"
              stroke="white"
              strokeWidth="8"
              transform="rotate(45 184 234)"
            />
          </svg>
        </motion.div>

        <div className="relative z-10 mx-auto flex h-full max-w-[1720px] items-center px-7 py-2 sm:px-12 lg:px-16 xl:px-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-[400px]"
          >
              <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.24em] sm:text-[10px] sm:tracking-[0.28em]" style={{ color: branding.primary_color }}>
                <span className="h-0.5 w-7 rounded-full" style={{ backgroundColor: branding.primary_color }} />
                Financer vos projets avec confiance
              </div>
              <h1 className="mt-2 max-w-[400px] font-serif text-[1.9rem] font-semibold leading-[1.03] tracking-tight text-slate-900 sm:text-[2.25rem] lg:text-[2.25rem] xl:text-[2.65rem]">
                {branding.homepage_title}
              </h1>
              <p className="mt-2 max-w-[400px] text-sm leading-5 text-slate-500 sm:text-base sm:leading-6">
                {branding.welcome_text}
              </p>

              <div className="mt-3 grid max-w-[400px] grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: <Zap className="h-4 w-4" />, label: 'Simple et rapide' },
                  { icon: <ShieldCheck className="h-4 w-4" />, label: 'Des solutions fiables' },
                  { icon: <UsersRound className="h-4 w-4" />, label: 'Une banque à vos côtés' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-semibold leading-[14px] text-slate-500 sm:gap-2 sm:text-xs sm:leading-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 sm:h-9 sm:w-9" style={{ color: branding.primary_color }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <a
                href="#stores"
                className="mt-3 inline-flex w-fit items-center rounded-full px-5 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.22)] transition-transform hover:-translate-y-0.5 sm:mt-4 sm:px-6 sm:py-2.5 sm:text-sm"
                style={{ background: `linear-gradient(100deg, ${branding.primary_color}, ${branding.secondary_color})` }}
              >
                Découvrir nos offres
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
          </motion.div>
        </div>
      </section>

      <section id="stores" className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-teal-500">
              Nos solutions de financement
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.6rem]">
              Découvrez nos offres adaptées à vos besoins
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-8 rounded-full bg-teal-400" />
          </div>

          <div className={`mx-auto mt-10 grid gap-4 ${storesGridClass}`}>
            {featuredStores.map((store) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: store.delay }}
              >
                <Link to={`/store/${encodeURIComponent(formatStoreSlug(store))}`} className="block h-full">
                  <div
                    className="group relative min-h-[198px] overflow-hidden rounded-xl border p-4 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.10)]"
                    style={{ backgroundColor: store.meta.cardBackground, borderColor: store.meta.cardBorder }}
                  >
                    {store.meta.illustration && (
                      <img
                        src={store.meta.illustration}
                        alt={`Visuel ${formatStoreName(store)}`}
                        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[56%] object-cover object-right opacity-90 transition-transform duration-500 group-hover:scale-105"
                        style={{ maskImage: 'linear-gradient(to right, transparent, black 28%)' }}
                      />
                    )}
                    <div className="relative z-10 flex h-full min-h-[164px] max-w-[58%] flex-col items-start text-left">
                      <h3 className="mt-1 text-[18px] font-bold leading-tight text-slate-900">
                        {formatStoreName(store)}
                      </h3>
                      <p className="mt-1 line-clamp-3 text-[12px] leading-[1.4] text-slate-600">
                        {store.description || `Découvrez la boutique ${store.label || store.name || 'store'}`}
                      </p>
                      <div
                        className="mt-auto inline-flex min-w-[136px] items-center justify-center rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors"
                        style={{ borderColor: store.meta.iconColor, color: store.meta.iconColor }}
                      >
                        Explorer
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1360px] rounded-2xl border border-slate-100 bg-white px-7 py-7 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:px-9">
            <div className="grid gap-7 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
              {[
                {
                  icon: <Zap className="h-5 w-5" />,
                  title: 'Rapide & simple',
                  text: 'Comparez et trouvez votre financement en quelques clics, sans aucune contrainte.',
                  color: '#8b5cf6',
                  bg: '#f3ecff',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: 'Offres fiables',
                  text: 'Des partenaires de confiance et des offres claires adaptées à vos besoins.',
                  color: '#3b82f6',
                  bg: '#eaf3ff',
                },
                {
                  icon: <CircleCheck className="h-5 w-5" />,
                  title: 'Processus simplifié',
                  text: 'De la comparaison à la validation, nous simplifions chaque étape pour vous faire gagner du temps.',
                  color: '#14b8a6',
                  bg: '#e8fbf8',
                },
              ].map((item, index) => (
                <div key={item.title} className={`flex items-center gap-5 ${index < 2 ? 'lg:pr-8' : ''} ${index > 0 ? 'lg:pl-8' : ''}`}>
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full [&>svg]:h-6 [&>svg]:w-6" style={{ backgroundColor: item.bg, color: item.color }}>
                  {item.icon}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">{item.text}</p>
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
