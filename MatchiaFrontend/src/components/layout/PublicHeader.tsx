import { Link, useLocation } from 'react-router';
import { Button } from '../ui/Button';
import { Menu, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchiaLogo } from '../brand/MatchiaLogo';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHomeActive = location.pathname === '/';
  const isBanksActive = location.pathname === '/banques';

  const navLinkClass = (isActive: boolean) =>
    `relative py-2 font-bold transition-colors ${
      isActive ? 'text-[#2563EB]' : 'text-[#111827] hover:text-[#2563EB]'
    }`;

  const mobileNavLinkClass = (isActive: boolean) =>
    `block py-2 font-bold transition-colors ${isActive ? 'text-[#2563EB]' : 'text-[#111827]'}`;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[68px] py-1.5">

          {/* Logo — à gauche */}
          <Link to="/" className="flex items-center gap-2">
            <MatchiaLogo />
          </Link>

          {/* Nav — au centre */}
          <nav className="hidden md:flex items-center gap-10">
            <Link to="/" className={navLinkClass(isHomeActive)}>
              Accueil
              {isHomeActive && (
                <span className="absolute bottom-0 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-[#2563EB]" />
              )}
            </Link>
            <Link to="/banques" className={navLinkClass(isBanksActive)}>
              Banques
              {isBanksActive && (
                <span className="absolute bottom-0 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-[#2563EB]" />
              )}
            </Link>
          </nav>

          {/* Boutons — à droite */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/rejoindre">
              <Button
                size="sm"
                variant="secondary"
                className="h-11 px-6 rounded-2xl text-sm font-extrabold text-white shadow-[0_9px_20px_rgba(249,115,22,0.22)]"
              >
                Rejoindre Matchia
              </Button>
            </Link>

            <Link to="/connexion">
              <Button
                variant="ghost"
                size="sm"
                icon={<UserRound className="h-5 w-5 stroke-[2.5]" />}
                className="h-11 gap-2 rounded-full bg-[#eef4ff] px-6 text-sm font-bold !text-[#2563EB] border-0 shadow-sm hover:bg-[#e0ecff] hover:shadow-md transition-all [&>svg]:text-[#2563EB]"
              >
                Connexion
              </Button>
            </Link>
          </div>

          {/* Burger mobile */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-white"
          >
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className={mobileNavLinkClass(isHomeActive)}>
                Accueil
              </Link>
              <Link to="/banques" className={mobileNavLinkClass(isBanksActive)}>
                Banques
              </Link>

              <div className="pt-3 border-t border-border space-y-2">
                <Link to="/rejoindre" className="block">
                  <Button
                    variant="secondary"
                    className="h-11 w-full rounded-2xl text-sm font-extrabold text-white shadow-[0_9px_20px_rgba(249,115,22,0.22)]"
                  >
                    Rejoindre Matchia
                  </Button>
                </Link>
                <Link to="/connexion" className="block">
                  <Button
                    variant="ghost"
                    icon={<UserRound className="h-5 w-5 stroke-[2.5]" />}
                    className="h-11 w-full gap-2 rounded-full bg-[#eef4ff] px-6 text-sm font-bold !text-[#2563EB] border-0 shadow-sm hover:bg-[#e0ecff] transition-all [&>svg]:text-[#2563EB]"
                  >
                    Connexion
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}