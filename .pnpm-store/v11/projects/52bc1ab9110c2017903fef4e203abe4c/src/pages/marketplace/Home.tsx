import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { motion } from 'motion/react';
import { BANNER_BACKGROUND_STYLE, BANNER_FRAME_CLASS } from '../../config/banner';
import {
  ArrowRight,
  Building2,
  CarFront,
  GraduationCap,
  HeartPulse,
  CircleCheck,
  ShieldCheck,
  Smartphone,
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
  icon: JSX.Element;
  iconBg: string;
  iconColor: string;
};

const getStoreMeta = (store: StoreLike): StoreCardMeta => {
  const raw = `${store.label || store.name || ''}`.toLowerCase();

  if (raw.includes('mobile') || raw.includes('smart')) {
    return {
      icon: <Smartphone className="h-5 w-5" />,
      iconBg: 'bg-cyan-50',
      iconColor: '#14b8a6',
    };
  }

  if (raw.includes('medical') || raw.includes('médical') || raw.includes('sant')) {
    return {
      icon: <HeartPulse className="h-5 w-5" />,
      iconBg: 'bg-violet-50',
      iconColor: '#8b5cf6',
    };
  }

  if (raw.includes('vehicle') || raw.includes('vehicule') || raw.includes('auto') || raw.includes('car')) {
    return {
      icon: <CarFront className="h-5 w-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: '#14b8a6',
    };
  }

  if (raw.includes('education') || raw.includes('edu') || raw.includes('school') || raw.includes('study')) {
    return {
      icon: <GraduationCap className="h-5 w-5" />,
      iconBg: 'bg-sky-50',
      iconColor: '#60a5fa',
    };
  }

  if (raw.includes('immobil') || raw.includes('logement') || raw.includes('habitat')) {
    return {
      icon: <Building2 className="h-5 w-5" />,
      iconBg: 'bg-orange-50',
      iconColor: '#f59e0b',
    };
  }

  if (raw.includes('yasmine') || raw.includes('personnel') || raw.includes('person')) {
    return {
      icon: <UsersRound className="h-5 w-5" />,
      iconBg: 'bg-pink-50',
      iconColor: '#f472b6',
    };
  }

  return {
    icon: <Building2 className="h-5 w-5" />,
    iconBg: 'bg-amber-50',
    iconColor: '#d97706',
  };
};

const formatStoreSlug = (store: StoreLike) => store.slug || store.name || store.id;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.trim().replace('#', '');

  if (normalized.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export function MarketplaceHome() {
  const { bankData, branding } = useOutletContext<MarketplaceHomeContext>();

  const featuredStores = useMemo(() => bankData.stores.map((store, index) => ({
    ...store,
    meta: getStoreMeta(store),
    delay: index * 0.08,
  })), [bankData.stores]);

  const heroOverlay = `linear-gradient(135deg, ${hexToRgba(branding.primary_color, 0.84)} 0%, ${hexToRgba(branding.secondary_color, 0.78)} 100%)`;

  return (
    <div className="bg-[#f8f6f2]">
      <section
        className={`relative ${BANNER_FRAME_CLASS} flex items-center`}
        style={
          branding.banner_image_url
            ? BANNER_BACKGROUND_STYLE(branding.banner_image_url)
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0" style={{ background: heroOverlay }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-4">
              {branding.homepage_title}
            </h1>
            <p className="text-xl mb-8 max-w-2xl opacity-90">
              {branding.welcome_text}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
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

          <div className="mx-auto mt-10 flex max-w-[1360px] flex-wrap justify-center gap-4">
            {featuredStores.map((store) => (
              <motion.div
                key={store.id}
                className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.75rem)] lg:w-[calc(16.666%-0.875rem)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: store.delay }}
              >
                <Link to={`/store/${encodeURIComponent(formatStoreSlug(store))}`} className="block h-full">
                  <div className="group flex h-full min-h-[230px] flex-col items-center rounded-xl border border-slate-100 bg-white p-5 text-center shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.10)]">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full [&>svg]:h-6 [&>svg]:w-6 ${store.meta.iconBg}`} style={{ color: store.meta.iconColor }}>
                      {store.meta.icon}
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="text-[17px] font-bold text-slate-800">
                        {store.label || store.name || 'Store'}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-slate-500">
                        {store.description || `Découvrez la boutique ${store.label || store.name || 'store'}`}
                      </p>
                    </div>
                    <div className="mt-4 w-full">
                      <div
                        className="inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors"
                        style={{ borderColor: `${store.meta.iconColor}66`, color: store.meta.iconColor }}
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
