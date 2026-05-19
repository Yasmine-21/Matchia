import { Link } from 'react-router';
import { Button } from '../ui/Button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-xl font-bold text-foreground">Matchia</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-[#2563EB] font-bold hover:opacity-80 transition-opacity">
                Accueil
              </Link>
              <Link to="/banques" className="text-[#2563EB] font-bold hover:opacity-80 transition-opacity">
                Banques
              </Link>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
          
            <Link to="/rejoindre">
              <Button size="sm" variant="secondary">Rejoindre Matchia</Button>
            </Link>
            <Link to="/connexion">
              {/* Modification ici : Fond bleu #2563EB et texte blanc */}
              <Button size="sm" className="w-32 bg-[#2563EB] text-white hover:opacity-90 font-bold border-none">
                Connexion
              </Button>
            </Link>
          </div>

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
              <Link to="/" className="block py-2 text-[#2563EB] font-bold">
                Accueil
              </Link>
              <Link to="/banques" className="block py-2 text-[#2563EB] font-bold">
                Banques
              </Link>
              
              <div className="pt-3 border-t border-border space-y-2">
                
                <Link to="/rejoindre" className="block">
                  <Button variant="secondary" className="w-full">Rejoindre Matchia</Button>
                </Link>
                <Link to="/connexion" className="block">
                  {/* Modification ici aussi pour le menu mobile */}
                  <Button className="w-full bg-[#2563EB] text-white hover:opacity-90 font-bold border-none">
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