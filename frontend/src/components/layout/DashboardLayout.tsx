import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ShoppingBagIcon,
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  BellIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import { useSiteStore } from '@/stores/site.store';
import { orderService } from '@/services/order.service';
import { eventService } from '@/services/event.service';
import ChatWidget from '@/components/chat/ChatWidget';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon },
  { name: 'Mes commandes', href: '/dashboard/orders', icon: ShoppingBagIcon },
  { name: 'Mes événements', href: '/dashboard/events', icon: CalendarIcon },
  { name: 'Mes factures', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Mes adresses', href: '/dashboard/addresses', icon: MapPinIcon },
  { name: 'Mon profil', href: '/dashboard/profile', icon: UserIcon },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [clientNotificationCount, setClientNotificationCount] = useState(0);
  const { user, logout } = useAuthStore();
  const { config } = useSiteStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep header/sidebar badges updated with latest orders and events.
  useEffect(() => {
    Promise.all([
      orderService.getMyOrders(1, 50),
      eventService.getMyEvents(1, 50),
    ]).then(([ordersRes, eventsRes]) => {
      const orders = (ordersRes.data || []) as Array<{ status: string }>;
      const events = (eventsRes.data || []) as Array<{ status: string }>;

      const active = orders.filter((o) =>
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)
      ).length;

      const orderAlerts = orders.filter((o) => ['READY', 'DELIVERING'].includes(o.status)).length;
      const eventAlerts = events.filter((e) => ['QUOTE_SENT', 'CONFIRMED', 'IN_PROGRESS'].includes(e.status)).length;

      setActiveOrderCount(active);
      setClientNotificationCount(orderAlerts + eventAlerts);
    }).catch(() => {/* silent */});
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Tableau de bord';
    if (path.includes('/orders/')) return 'Détail commande';
    if (path.includes('/orders')) return 'Mes commandes';
    if (path.includes('/events/')) return 'Détail événement';
    if (path.includes('/events')) return 'Mes événements';
    if (path.includes('/invoices')) return 'Mes factures';
    if (path.includes('/addresses')) return 'Mes adresses';
    if (path.includes('/profile')) return 'Mon profil';
    return 'Mon espace';
  };

  const sidebarContent = (mobile = false) => (
    <>
      {/* Quick Actions */}
      <div className="px-4 pt-4 pb-2">
        <Link
          to="/menu"
          onClick={() => mobile && setSidebarOpen(false)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          Nouvelle commande
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-3 pt-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
          Mon espace
        </p>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/dashboard'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-sm shadow-primary-500/10'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
            onClick={() => mobile && setSidebarOpen(false)}
          >
            <item.icon className="h-[18px] w-[18px] flex-shrink-0 transition-transform group-hover:scale-110" />
            <span className="flex-1">{item.name}</span>
            {item.href === '/dashboard/orders' && activeOrderCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                {activeOrderCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Extra links */}
        <div className="pt-3 mt-2 border-t border-gray-100">
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
            Raccourcis
          </p>
          <Link
            to="/events/create"
            onClick={() => mobile && setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
          >
            <CalendarIcon className="h-[18px] w-[18px]" />
            <span className="flex-1">Organiser événement</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-40" />
          </Link>
          <Link
            to="/menu"
            onClick={() => mobile && setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
          >
            <ShoppingBagIcon className="h-[18px] w-[18px]" />
            <span className="flex-1">Voir le menu</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-40" />
          </Link>
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/20 flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all py-2 rounded-xl"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍽️</span>
                  <span className="font-display text-lg font-semibold text-gray-900">{config.siteName}</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              {sidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200/80">
          <div className="flex h-16 items-center px-5 border-b border-gray-100">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <span className="text-2xl group-hover:scale-110 transition-transform">🍽️</span>
              <span className="font-display text-lg font-semibold text-gray-900">{config.siteName}</span>
            </NavLink>
          </div>
          {sidebarContent()}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bars3Icon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active order notification */}
            {activeOrderCount > 0 && (
              <Link
                to="/dashboard/orders"
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                </span>
                {activeOrderCount} en cours
              </Link>
            )}
            <Link
              to="/dashboard"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              title={clientNotificationCount > 0 ? `${clientNotificationCount} notifications` : 'Notifications'}
            >
              <BellIcon className="h-4.5 w-4.5" />
              {clientNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                  {clientNotificationCount > 9 ? '9+' : clientNotificationCount}
                </span>
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
