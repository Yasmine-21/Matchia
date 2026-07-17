import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CarFront,
  GraduationCap,
  HeartPulse,
  Smartphone,
  Star,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
      icon: <Smartphone className="h-6 w-6" />,
      iconBg: 'bg-rose-50',
      iconColor: '#b91c1c',
    };
  }

  if (raw.includes('medical') || raw.includes('médical') || raw.includes('sant')) {
    return {
      icon: <HeartPulse className="h-6 w-6" />,
      iconBg: 'bg-indigo-50',
      iconColor: '#4f46e5',
    };
  }

  if (raw.includes('vehicle') || raw.includes('vehicule') || raw.includes('auto') || raw.includes('car')) {
    return {
      icon: <CarFront className="h-6 w-6" />,
      iconBg: 'bg-emerald-50',
      iconColor: '#0f9f63',
    };
  }

  if (raw.includes('education') || raw.includes('edu') || raw.includes('school') || raw.includes('study')) {
    return {
      icon: <GraduationCap className="h-6 w-6" />,
      iconBg: 'bg-sky-50',
      iconColor: '#0369a1',
    };
  }

  return {
    icon: <Building2 className="h-6 w-6" />,
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

  const primaryStore = bankData.stores[0];
  const heroOverlay = `linear-gradient(135deg, ${hexToRgba(branding.primary_color, 0.84)} 0%, ${hexToRgba(branding.secondary_color, 0.78)} 100%)`;

  return (
    <div className="bg-[#f8f6f2]">
      <section
        className="relative h-96 flex items-center bg-cover bg-center"
        style={
          branding.banner_image_url
            ? {
                backgroundImage: `url(${branding.banner_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
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
            <div className="flex gap-4">
              <Link to={`/store/${encodeURIComponent(formatStoreSlug(primaryStore || { id: 'home' }))}`}>
                <Button
                  size="lg"
                  className="rounded-none"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Explorer nos solutions
                </Button>
              </Link>
              <Link to="/connexion">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/20"
                >
                  Se connecter
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-500">
              Nos solutions de financement
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Découvrez nos offres adaptées à vos besoins
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredStores.map((store) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: store.delay }}
              >
                <Link to={`/store/${encodeURIComponent(formatStoreSlug(store))}`} className="block h-full">
                  <div className="group flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(15,23,42,0.10)]">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${store.meta.iconBg}`} style={{ color: store.meta.iconColor }}>
                      {store.meta.icon}
                    </div>
                    <div className="mt-6 flex-1">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {store.label || store.name || 'Store'}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {store.description || `Découvrez la boutique ${store.label || store.name || 'store'}`}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-sm text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold text-slate-900">4.8</span>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors group-hover:border-[#b1121a] group-hover:text-[#b1121a]">
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Explorer
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-slate-200 bg-[#fffaf4] px-6 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:px-8">
            <div className="grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
              {[
                {
                  icon: <UsersRound className="h-6 w-6" />,
                  title: 'Simple & rapide',
                  text: 'Des solutions accessibles en quelques clics.',
                  color: '#9f1239',
                  bg: '#fbeaec',
                },
                {
                  icon: <Star className="h-6 w-6" />,
                  title: 'Offres de qualité',
                  text: 'Des partenaires fiables et des conditions claires.',
                  color: '#c08a15',
                  bg: '#fff3d8',
                },
                {
                  icon: <TrendingUp className="h-6 w-6" />,
                  title: 'Accompagnement',
                  text: 'Nous vous accompagnons dans chaque étape.',
                  color: '#9b1231',
                  bg: '#fbeaec',
                },
              ].map((item, index) => (
                <div key={item.title} className={`flex items-start gap-4 ${index < 2 ? 'lg:pr-6' : ''} ${index > 0 ? 'lg:pl-6' : ''}`}>
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: item.bg, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
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
