import { Link } from 'react-router';
import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { MatchiaLogo } from '../brand/MatchiaLogo';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#08112a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <MatchiaLogo className="mb-4" textClassName="text-xl font-bold text-white" />
            <p className="max-w-xs text-sm leading-7 text-slate-300">
              La plateforme digitale de financement qui permet aux banques de lancer rapidement leur marketplace.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Produit</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/" className="transition-colors hover:text-white">Fonctionnalités</Link></li>
              <li><Link to="/banques" className="transition-colors hover:text-white">Banques</Link></li>
              <li><Link to="/rejoindre" className="transition-colors hover:text-white">Rejoindre Matchia</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Ressources</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/" className="transition-colors hover:text-white">Blog</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">FAQ</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Cas clients</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Entreprise</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/" className="transition-colors hover:text-white">À propos</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Partenaires</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Carrières</Link></li>
              <li><Link to="/" className="transition-colors hover:text-white">Presse</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@matchia.com" className="transition-colors hover:text-white">
                  contact@matchia.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+216 71 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Tunis, Tunisie</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>(c) 2026 Matchia. Tous droits réservés.</p>
            <div className="flex flex-wrap gap-5">
              <Link to="/" className="transition-colors hover:text-white">Mentions légales</Link>
              <Link to="/" className="transition-colors hover:text-white">Politique de confidentialité</Link>
              <Link to="/" className="transition-colors hover:text-white">Conditions d’utilisation</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
