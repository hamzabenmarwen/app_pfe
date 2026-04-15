import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';

const quickLinks = [
  { name: 'Menu', href: '/menu' },
  { name: 'Événements', href: '/events/create' },
  { name: 'Contact', href: '/contact' },
];

const legalLinks = [
  { name: 'Conditions', href: '/terms' },
  { name: 'Confidentialité', href: '/privacy' },
];

export default function Footer() {
  const { config } = useSiteStore();

  return (
    <footer className="relative border-t border-gray-200 overflow-hidden">
      {/* Subtle gradient orb */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-500/[0.03] rounded-full blur-3xl" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Top — large brand */}
        <FadeIn>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 mb-20">
            <div>
              <Link to="/" className="group">
                {config.siteLogo ? (
                  <img src={config.siteLogo} alt={config.siteName} className="h-12 max-h-12 object-contain" />
                ) : (
                  <span className="font-display text-4xl sm:text-5xl font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {config.siteName}<span className="text-primary-400">.</span>
                  </span>
                )}
              </Link>
              <p className="mt-4 text-gray-400 max-w-sm text-sm font-light leading-relaxed">
                Plateforme intelligente de gestion pour traiteurs.
                Commandes, événements, IA.
              </p>
            </div>

            <div className="flex gap-12 lg:gap-16">
              {/* Links */}
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.35em] text-gray-400 mb-5 font-light">Navigation</h4>
                <ul className="space-y-3">
                  {quickLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-gray-700 text-sm font-light transition-colors duration-300"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.35em] text-gray-400 mb-5 font-light">Contact</h4>
                <ul className="space-y-3 text-sm text-gray-400 font-light">
                  <li>{config.siteEmail}</li>
                  <li>{config.sitePhone}</li>
                  <li>{config.siteAddress}</li>
                </ul>
              </div>

              {/* Legal */}
              <div className="hidden sm:block">
                <h4 className="text-[10px] uppercase tracking-[0.35em] text-gray-400 mb-5 font-light">Légal</h4>
                <ul className="space-y-3">
                  {legalLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-gray-700 text-sm font-light transition-colors duration-300"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Réseaux sociaux */}
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.35em] text-gray-400 mb-5 font-light">Suivez-nous</h4>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-primary-500 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 group"
                    aria-label="Facebook"
                  >
                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 group"
                    aria-label="Instagram"
                  >
                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-3 font-light leading-relaxed">
                  Retrouvez nos plats du jour<br />sur notre page Facebook
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Divider */}
        <div className="hr-editorial mb-6" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-xs font-light">
            &copy; {new Date().getFullYear()} {config.siteName}. Tous droits réservés.
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-400 text-xs font-light"
          >
            Fait avec soin en Tunisie
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
