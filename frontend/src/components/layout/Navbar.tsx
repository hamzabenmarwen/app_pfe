import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon, ShoppingCartIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useSiteStore } from '@/stores/site.store';

const navigation = [
  { name: 'Accueil', href: '/' },
  { name: 'Événements', href: '/events/create' },
  { name: 'Menu', href: '/menu' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.itemCount());
  const { config } = useSiteStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-2xl border-b border-gray-200'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 lg:h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              {config.siteLogo ? (
                <img src={config.siteLogo} alt={config.siteName} className="h-8 max-h-8 object-contain" />
              ) : (
                <span className="font-display text-xl font-medium tracking-[-0.02em] text-gray-900 group-hover:text-primary-600 transition-colors">
                  {config.siteName}<span className="text-primary-400">.</span>
                </span>
              )}
            </Link>

            {/* Desktop Navigation — centered */}
            <div className="hidden md:flex md:items-center md:gap-0.5">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `relative px-5 py-2 text-[13px] font-light tracking-[0.04em] transition-all duration-300 ${
                      isActive
                        ? 'text-primary-600 font-medium'
                        : 'text-gray-500 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.name}
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute -bottom-0.5 left-5 right-5 h-px bg-primary-400/60"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2.5 rounded-full text-gray-500 hover:text-primary-600 transition-all duration-300"
              >
                <ShoppingCartIcon className="h-[18px] w-[18px]" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 bg-primary-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Desktop user menu */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-1">
                  <Link
                    to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-light text-gray-500 hover:text-primary-600 transition-all duration-300"
                  >
                    <div className="h-6 w-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <span className="text-gray-700 text-[10px] font-medium">{user?.firstName?.[0]}</span>
                    </div>
                    {user?.firstName}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-gray-400 hover:text-red-400 transition-all duration-300"
                    title="Déconnexion"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-1.5 text-[13px] font-light text-gray-500 hover:text-primary-600 transition-all duration-300"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2 text-[13px] font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-all duration-300"
                  >
                    S&apos;inscrire
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="md:hidden p-2 rounded-full text-gray-500 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Spacer */}
      <div className="h-16 lg:h-20" />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white backdrop-blur-2xl z-50 md:hidden border-l border-gray-200"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                  <span className="font-display text-lg font-medium text-gray-900">Menu</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </motion.button>
                </div>

                <nav className="flex-1 p-5 space-y-1">
                  {navigation.map((item, i) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                    >
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-light transition-all duration-300 ${
                            isActive
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`
                        }
                      >
                        {item.name}
                      </NavLink>
                    </motion.div>
                  ))}
                </nav>

                <div className="p-5 border-t border-gray-200 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-gray-700 font-light"
                      >
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-700 text-xs font-medium">{user?.firstName?.[0]}</span>
                        </div>
                        Mon compte
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/5 font-light transition-colors"
                      >
                        Déconnexion
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="block w-full px-4 py-3 text-center rounded-xl border border-gray-200 text-gray-500 font-light hover:border-gray-300 transition-colors"
                      >
                        Connexion
                      </Link>
                      <Link
                        to="/register"
                        className="block w-full px-4 py-3 text-center rounded-xl bg-primary-500 text-white font-medium"
                      >
                        S&apos;inscrire
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
