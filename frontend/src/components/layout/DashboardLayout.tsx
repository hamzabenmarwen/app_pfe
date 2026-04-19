import { useState, useEffect, useRef } from 'react';
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
import { authService } from '@/services/auth.service';
import { useSiteStore } from '@/stores/site.store';
import { orderService, type Invoice } from '@/services/order.service';
import { eventService, type EventInvoice } from '@/services/event.service';
import ChatWidget from '@/components/chat/ChatWidget';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon },
  { name: 'Mes commandes', href: '/dashboard/orders', icon: ShoppingBagIcon },
  { name: 'Mes événements', href: '/dashboard/events', icon: CalendarIcon },
  { name: 'Mes factures', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Mes adresses', href: '/dashboard/addresses', icon: MapPinIcon },
  { name: 'Mon profil', href: '/dashboard/profile', icon: UserIcon },
];

interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  href: string;
}

const CLIENT_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  CONFIRMED: 'confirmee',
  PREPARING: 'en preparation',
  READY: 'prete',
  DELIVERING: 'en livraison',
  DELIVERED: 'livree',
  CANCELLED: 'annulee',
};

const CLIENT_EVENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  PENDING_QUOTE: 'en attente de devis',
  QUOTE_SENT: 'devis envoye',
  QUOTE_ACCEPTED: 'devis accepte',
  CONFIRMED: 'confirme',
  IN_PROGRESS: 'en cours',
  COMPLETED: 'termine',
  CANCELLED: 'annule',
};

const CLIENT_INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'brouillon',
  SENT: 'emise',
  OVERDUE: 'en retard',
  FAILED: 'echec paiement',
  PAID: 'payee',
};

function toClientStatusLabel(status: string | undefined, labels: Record<string, string>) {
  if (!status) return 'mis a jour';
  return labels[status] || status.toLowerCase();
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [activeEventCount, setActiveEventCount] = useState(0);
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0);
  const [clientNotificationCount, setClientNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<DashboardNotificationItem[]>([]);
  const { user, logout } = useAuthStore();
  const { config } = useSiteStore();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement | null>(null);

  // Keep header/sidebar badges updated with latest orders and events.
  useEffect(() => {
    Promise.all([
      orderService.getMyOrders(1, 50),
      eventService.getMyEvents(1, 50),
      orderService.getMyInvoices(1, 20),
      eventService.getMyEventInvoices(1, 20),
    ]).then(([ordersRes, eventsRes, orderInvoicesRes, eventInvoicesRes]) => {
      const orders = (ordersRes.data || []) as Array<{ id: string; orderNumber?: string; status: string }>;
      const events = (eventsRes.data || []) as Array<{ id: string; name?: string; status: string }>;
      const orderInvoices = (orderInvoicesRes.data || []) as Invoice[];
      const eventInvoices = (eventInvoicesRes.data || []) as EventInvoice[];

      const active = orders.filter((o) =>
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)
      ).length;

      const orderAlertStatuses = ['READY', 'DELIVERING'];
      const eventAlertStatuses = ['QUOTE_SENT', 'CONFIRMED', 'IN_PROGRESS'];
      const invoiceAlertStatuses = ['SENT', 'OVERDUE', 'FAILED', 'DRAFT'];

      const orderAlerts = orders.filter((o) => orderAlertStatuses.includes(o.status));
      const eventAlerts = events.filter((e) => eventAlertStatuses.includes(e.status));
      const invoiceAlerts = orderInvoices.filter((invoice) => invoiceAlertStatuses.includes(invoice.status));
      const eventInvoiceAlerts = eventInvoices.filter((invoice) => invoiceAlertStatuses.includes(invoice.status));
      const activeEvents = events.filter((e) => ['PENDING', 'PENDING_QUOTE', 'QUOTE_SENT', 'CONFIRMED', 'IN_PROGRESS'].includes(e.status));
      const pendingInvoices = [...orderInvoices, ...eventInvoices].filter((invoice) => ['SENT', 'OVERDUE', 'FAILED'].includes(invoice.status));

      const items: DashboardNotificationItem[] = [
        ...orderAlerts.slice(0, 4).map((order, idx) => ({
          id: `order-${idx}`,
          title: 'Mise a jour commande',
          message: `Commande ${order.orderNumber || `#${order.id.slice(-6)}`} ${toClientStatusLabel(order.status, CLIENT_ORDER_STATUS_LABELS)}.`,
          href: '/dashboard/orders',
        })),
        ...eventAlerts.slice(0, 3).map((event, idx) => ({
          id: `event-${idx}`,
          title: 'Mise a jour evenement',
          message: `${event.name || 'Evenement'} est ${toClientStatusLabel(event.status, CLIENT_EVENT_STATUS_LABELS)}.`,
          href: '/dashboard/events',
        })),
        ...invoiceAlerts.slice(0, 4).map((invoice) => ({
          id: `invoice-${invoice.id}`,
          title: 'Notification facture',
          message: `Facture ${invoice.invoiceNumber} ${toClientStatusLabel(invoice.status, CLIENT_INVOICE_STATUS_LABELS)}.`,
          href: '/dashboard/invoices',
        })),
        ...eventInvoiceAlerts.slice(0, 3).map((invoice) => ({
          id: `event-invoice-${invoice.id}`,
          title: 'Facture evenement',
          message: `Facture ${invoice.invoiceNumber} ${toClientStatusLabel(invoice.status, CLIENT_INVOICE_STATUS_LABELS)}.`,
          href: '/dashboard/invoices',
        })),
      ].slice(0, 10);

      setActiveOrderCount(active);
      setActiveEventCount(activeEvents.length);
      setPendingInvoiceCount(pendingInvoices.length);
      setClientNotificationCount(items.length);
      setNotificationItems(items);
    }).catch(() => {/* silent */});
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Silent fallback: local logout should still happen.
    } finally {
      logout();
      navigate('/');
    }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.06),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.08),_transparent_36%),#f8fafc]">
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
        <div className="flex flex-col flex-grow bg-white/95 backdrop-blur-sm border-r border-gray-200/80 shadow-[8px_0_32px_-20px_rgba(2,6,23,0.25)]">
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
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">Espace client</p>
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
            {activeEventCount > 0 && (
              <Link
                to="/dashboard/events"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {activeEventCount} evenement(s)
              </Link>
            )}
            {pendingInvoiceCount > 0 && (
              <Link
                to="/dashboard/invoices"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {pendingInvoiceCount} facture(s)
              </Link>
            )}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title={clientNotificationCount > 0 ? `${clientNotificationCount} notifications` : 'Notifications'}
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-expanded={notificationsOpen}
                aria-label="Ouvrir les notifications"
              >
                <BellIcon className="h-4.5 w-4.5" />
                {clientNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                    {clientNotificationCount > 9 ? '9+' : clientNotificationCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      <Link
                        to="/dashboard/invoices"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        Voir factures
                      </Link>
                    </div>

                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notificationItems.map((item) => (
                          <Link
                            key={item.id}
                            to={item.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-800">{item.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{item.message}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
