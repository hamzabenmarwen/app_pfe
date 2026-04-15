import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  TagIcon,
  CakeIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  ReceiptRefundIcon,
  TruckIcon,
  DocumentMagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  DocumentChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import { useSiteStore } from '@/stores/site.store';
import { orderService } from '@/services/order.service';
import { eventService } from '@/services/event.service';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: 'Vue globale',
    items: [
      { name: 'Dashboard', href: '/admin', icon: HomeIcon },
      { name: 'Statistiques', href: '/admin/stats', icon: ChartBarIcon },
      { name: 'Calendrier', href: '/admin/calendar', icon: CalendarDaysIcon },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Plats', href: '/admin/plats', icon: CakeIcon },
      { name: 'Catégories', href: '/admin/categories', icon: TagIcon },
      { name: 'Commandes', href: '/admin/orders', icon: ShoppingBagIcon },
      { name: 'Événements', href: '/admin/events', icon: CalendarIcon },
      { name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon },
      { name: 'Paramètres', href: '/admin/settings', icon: CogIcon },
    ],
  },
  {
    title: 'Documents',
    items: [
      { name: 'Devis', href: '/admin/quotes', icon: DocumentTextIcon },
      { name: 'Factures', href: '/admin/documents/factures', icon: ClipboardDocumentListIcon },
      { name: 'Bon de commande', href: '/admin/documents/purchase-orders', icon: ShoppingBagIcon },
      { name: 'Avoirs client', href: '/admin/documents/credit-notes', icon: ReceiptRefundIcon },
      { name: 'AI Scanner', href: '/admin/documents/ai-scanner', icon: DocumentMagnifyingGlassIcon },
    ],
  },
  {
    title: 'Stock',
    items: [
      { name: 'Gestion du stock', href: '/admin/stock', icon: ArchiveBoxIcon },
      { name: 'Mouvements', href: '/admin/stock/movements', icon: ArrowsRightLeftIcon },
      { name: 'Inventaire', href: '/admin/stock/take', icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Paiements et caisse', href: '/admin/finance/payments-cash', icon: BanknotesIcon },
      { name: 'Dépenses', href: '/admin/finance/expenses', icon: DocumentTextIcon },
      { name: 'Audit logs', href: '/admin/finance/audit-logs', icon: ShieldCheckIcon },
    ],
  },
  {
    title: 'Achats et IA',
    items: [
      { name: 'Fournisseurs', href: '/admin/suppliers', icon: TruckIcon },
      { name: 'Report Generator', href: '/admin/reports/generator', icon: DocumentChartBarIcon },
      { name: 'AI Report Generate', href: '/admin/reports/ai', icon: SparklesIcon },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminAlerts, setAdminAlerts] = useState({ orders: 0, events: 0, quotes: 0 });
  const { user, logout } = useAuthStore();
  const { config } = useSiteStore();
  const navigate = useNavigate();
  const location = useLocation();

  const totalAdminAlerts = adminAlerts.orders + adminAlerts.events + adminAlerts.quotes;

  useEffect(() => {
    Promise.all([
      orderService.getAllOrders(1, 100),
      eventService.getAllEvents(1, 100),
      eventService.getAllQuotes(1, 100),
    ]).then(([ordersRes, eventsRes, quotesRes]) => {
      const orders = (ordersRes.data || []) as Array<{ status: string }>;
      const events = (eventsRes.data || []) as Array<{ status: string }>;
      const quotes = (quotesRes.data || []) as Array<{ status: string }>;

      const ordersCount = orders.filter((o) => ['PENDING', 'CONFIRMED'].includes(o.status)).length;
      const eventsCount = events.filter((e) => ['PENDING', 'PENDING_QUOTE', 'QUOTE_SENT'].includes(e.status)).length;
      const quotesCount = quotes.filter((q) => q.status === 'SENT').length;

      setAdminAlerts({ orders: ordersCount, events: eventsCount, quotes: quotesCount });
    }).catch(() => {
      setAdminAlerts({ orders: 0, events: 0, quotes: 0 });
    });
  }, [location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard admin';
    if (path.includes('/orders')) return 'Commandes';
    if (path.includes('/events')) return 'Événements';
    if (path.includes('/quotes')) return 'Devis';
    if (path.includes('/users')) return 'Utilisateurs';
    if (path.includes('/stats')) return 'Statistiques';
    if (path.includes('/calendar')) return 'Calendrier';
    if (path.includes('/settings')) return 'Paramètres';
    return 'Administration';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarContent = (mobile = false) => (
    <>
      <div className="px-4 py-3">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.15em]">
          Tableau de bord
        </span>
      </div>
      <nav className="flex-1 min-h-0 px-3 pb-4 overflow-y-auto overscroll-contain space-y-4">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  onClick={() => mobile && setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-white font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400">Administrateur</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors py-1.5"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-transparent">
      {/* Mobile sidebar */}
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-2xl flex flex-col min-h-0 lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
                <span className="font-display text-xl font-medium text-gray-900">Admin</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {sidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:h-screen lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow min-h-0 bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b border-gray-100">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="font-display text-xl font-medium text-gray-900">{config.siteName}</span>
            </NavLink>
          </div>
          {sidebarContent()}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden">
              <Bars3Icon className="h-6 w-6" />
            </button>
            <span className="font-display text-base sm:text-lg font-medium text-gray-900 truncate">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/admin"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              title={`Alertes: ${adminAlerts.orders} commandes, ${adminAlerts.events} événements, ${adminAlerts.quotes} devis`}
            >
              <BellIcon className="h-4.5 w-4.5" />
              {totalAdminAlerts > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                  {totalAdminAlerts > 9 ? '9+' : totalAdminAlerts}
                </span>
              )}
            </NavLink>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
