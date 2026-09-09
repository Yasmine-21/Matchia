import { Link } from 'react-router';
import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { MatchiaLogo } from '../brand/MatchiaLogo';
import '../../styles/PublicFooter.css';

export function PublicFooter() {
  return (
    <footer className="public-footer border-t text-white">
      <div className="public-footer-shapes" aria-hidden="true">
        <span className="public-footer-shape public-footer-shape-gold" />
        <span className="public-footer-shape public-footer-shape-purple" />
        <span className="public-footer-shape public-footer-shape-teal" />
        <span className="public-footer-shape public-footer-shape-blue" />
      </div>

      <div className="public-footer-container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="public-footer-grid grid gap-10 md:grid-cols-2 xl:grid-cols-6">
          <div className="public-footer-brand xl:col-span-2">
            <MatchiaLogo className="mb-4" textClassName="text-xl font-bold text-white" />
            <p className="max-w-xs text-sm leading-7 text-slate-300">
              La plateforme digitale de financement qui permet aux banques de lancer rapidement leur marketplace.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="public-footer-social-link flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="public-footer-social-link flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:text-white">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="public-footer-social-link flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:text-white">
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
              <li><Link to="/devenir-concessionnaire" className="transition-colors hover:text-white">Devenir concessionnaire</Link></li>
             
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

        <div className="public-footer-bottom mt-10 border-t pt-6 text-sm">
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
