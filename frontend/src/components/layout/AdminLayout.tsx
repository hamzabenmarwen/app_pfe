import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
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
import { authService } from '@/services/auth.service';
import { useSiteStore } from '@/stores/site.store';
import { orderService, type Invoice } from '@/services/order.service';
import { eventService } from '@/services/event.service';
import { connectRealtime } from '@/services/realtime.service';
import { useNotificationStore } from '@/stores/notification.store';

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

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  CONFIRMED: 'confirmee',
  PREPARING: 'en preparation',
  READY: 'prete',
  DELIVERING: 'en livraison',
  DELIVERED: 'livree',
  CANCELLED: 'annulee',
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  PENDING_QUOTE: 'en attente de devis',
  QUOTE_SENT: 'devis envoye',
  QUOTE_ACCEPTED: 'devis accepte',
  CONFIRMED: 'confirme',
  IN_PROGRESS: 'en cours',
  COMPLETED: 'termine',
  CANCELLED: 'annule',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'brouillon',
  SENT: 'envoye',
  ACCEPTED: 'accepte',
  REJECTED: 'rejete',
  EXPIRED: 'expire',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'brouillon',
  SENT: 'emise',
  PAID: 'payee',
  OVERDUE: 'en retard',
  FAILED: 'echec paiement',
  CANCELLED: 'annulee',
};

function toStatusLabel(status: string | undefined, labels: Record<string, string>): string {
  if (!status) return 'mis a jour';
  return labels[status] || status.toLowerCase();
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate).getTime();
  if (Number.isNaN(date)) return '';

  const diffMs = date - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 1) return 'a l\'instant';
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

const ADMIN_LAST_SYNC_KEY = 'assiette-gala-admin-notif-last-sync';
const ADMIN_BACKFILL_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_ORDER_ALERT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminLastSyncAt(): number {
  try {
    const raw = window.localStorage.getItem(ADMIN_LAST_SYNC_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage failures and fallback to rolling window.
  }

  return Date.now() - ADMIN_BACKFILL_WINDOW_MS;
}

function setAdminLastSyncAt(value: number): void {
  try {
    window.localStorage.setItem(ADMIN_LAST_SYNC_KEY, String(value));
  } catch {
    // Ignore storage failures.
  }
}

function isAfterPivot(isoDate: string | undefined, pivot: number): boolean {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  return Number.isFinite(time) && time > pivot;
}

function formatCurrency(value: number | string | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `${amount.toFixed(2)} DT`;
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { config } = useSiteStore();
  const notifications = useNotificationStore((state) => state.notifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAdminNotifications = useNotificationStore((state) => state.clearAdminNotifications);
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const snapshotsRef = useRef({
    orders: new Map<string, string>(),
    events: new Map<string, string>(),
    quotes: new Map<string, string>(),
    invoices: new Map<string, string>(),
  });

  const adminNotifications = useMemo(
    () =>
      notifications
        .filter((notification) => {
          const audience = notification.audience || 'ALL';
          if (audience === 'CLIENT') return false;
          if (notification.userId && notification.userId !== user?.id) return false;
          if (notification.href?.startsWith('/dashboard')) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, user?.id]
  );

  const unreadAdminCount = useMemo(
    () => adminNotifications.filter((notification) => !notification.read).length,
    [adminNotifications]
  );

  const unreadByType = useMemo(() => {
    return adminNotifications.reduce(
      (acc, notification) => {
        if (notification.read) return acc;
        if (notification.type === 'order') acc.orders += 1;
        if (notification.type === 'event') acc.events += 1;
        if (notification.type === 'invoice') acc.invoices += 1;
        return acc;
      },
      { orders: 0, events: 0, invoices: 0 }
    );
  }, [adminNotifications]);

  const visibleAdminNotifications = adminNotifications.slice(0, 20);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const socket = connectRealtime();
    if (!socket) return;

    const onOrderCreated = (payload: any) => {
      const amount = formatCurrency(payload?.totalAmount);
      addNotification({
        type: 'order',
        audience: 'ADMIN',
        title: 'Nouvelle commande',
        message: `Commande ${payload?.orderNumber || ''} recue (${toStatusLabel(payload?.status, ORDER_STATUS_LABELS)})${amount ? ` - ${amount}` : ''}.`,
        href: '/admin/orders',
        dedupKey: `order.created:${payload?.orderId || payload?.orderNumber || 'unknown'}`,
      });
    };

    const onOrderUpdated = (payload: any) => {
      addNotification({
        type: 'order',
        audience: 'ADMIN',
        title: 'Commande mise a jour',
        message: `Commande ${payload?.orderNumber || ''} est maintenant ${toStatusLabel(payload?.status, ORDER_STATUS_LABELS)}.`,
        href: '/admin/orders',
        dedupKey: `order.status.updated:${payload?.orderId || payload?.orderNumber || 'unknown'}:${payload?.status || 'unknown'}`,
      });
    };

    const onEventCreated = (payload: any) => {
      addNotification({
        type: 'event',
        audience: 'ADMIN',
        title: 'Nouvelle demande evenement',
        message: `${payload?.name || 'Evenement'} a ete cree.`,
        href: payload?.eventId ? `/admin/events/${payload.eventId}` : '/admin/events',
        dedupKey: `event.created:${payload?.eventId || payload?.name || 'unknown'}`,
      });
    };

    const onEventUpdated = (payload: any) => {
      addNotification({
        type: 'event',
        audience: 'ADMIN',
        title: 'Statut evenement mis a jour',
        message: `${payload?.name || 'Evenement'} est ${toStatusLabel(payload?.status, EVENT_STATUS_LABELS)}.`,
        href: payload?.eventId ? `/admin/events/${payload.eventId}` : '/admin/events',
        dedupKey: `event.status.updated:${payload?.eventId || payload?.name || 'unknown'}:${payload?.status || 'unknown'}`,
      });
    };

    const onQuoteUpdated = (payload: any) => {
      addNotification({
        type: 'quote',
        audience: 'ADMIN',
        title: 'Devis mis a jour',
        message: `Devis ${payload?.quoteNumber || ''} est ${toStatusLabel(payload?.status, QUOTE_STATUS_LABELS)}.`,
        href: '/admin/quotes',
        dedupKey: `quote.status.updated:${payload?.quoteId || payload?.quoteNumber || 'unknown'}:${payload?.status || 'unknown'}`,
      });
    };

    socket.on('order.created', onOrderCreated);
    socket.on('order.status.updated', onOrderUpdated);
    socket.on('event.created', onEventCreated);
    socket.on('event.status.updated', onEventUpdated);
    socket.on('quote.status.updated', onQuoteUpdated);

    return () => {
      socket.off('order.created', onOrderCreated);
      socket.off('order.status.updated', onOrderUpdated);
      socket.off('event.created', onEventCreated);
      socket.off('event.status.updated', onEventUpdated);
      socket.off('quote.status.updated', onQuoteUpdated);
    };
  }, [addNotification, user]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    let cancelled = false;

    const syncSnapshots = async (emitChanges: boolean) => {
      try {
        const previousSyncAt = getAdminLastSyncAt();
        const [ordersRes, eventsRes, quotesRes, invoicesRes] = await Promise.all([
          orderService.getAllOrders(1, 100),
          eventService.getAllEvents(1, 100),
          eventService.getAllQuotes(1, 100),
          orderService.getAllInvoices(1, 100),
        ]);

        if (cancelled) return;

        const orders = (ordersRes.data || []) as Array<{
          id: string;
          orderNumber?: string;
          status: string;
          totalAmount?: number;
          createdAt?: string;
        }>;
        const events = (eventsRes.data || []) as Array<{
          id: string;
          name?: string;
          status: string;
          createdAt?: string;
        }>;
        const quotes = (quotesRes.data || []) as Array<{
          id: string;
          quoteNumber?: string;
          status: string;
          createdAt?: string;
        }>;
        const invoices = (invoicesRes.data || []) as Invoice[];

        if (!emitChanges && orders.length === 0 && events.length === 0 && quotes.length === 0 && invoices.length === 0) {
          clearAdminNotifications(user.id);
          snapshotsRef.current.orders = new Map();
          snapshotsRef.current.events = new Map();
          snapshotsRef.current.quotes = new Map();
          snapshotsRef.current.invoices = new Map();
          setAdminLastSyncAt(Date.now());
          return;
        }

        const nextOrderMap = new Map<string, string>();
        const nextEventMap = new Map<string, string>();
        const nextQuoteMap = new Map<string, string>();
        const nextInvoiceMap = new Map<string, string>();

        orders.forEach((order) => {
          nextOrderMap.set(order.id, order.status);
          if (!emitChanges) {
            const isRecentPendingOrder =
              ['PENDING', 'CONFIRMED'].includes(order.status) &&
              isAfterPivot(order.createdAt, Date.now() - RECENT_ORDER_ALERT_WINDOW_MS);

            if (isAfterPivot(order.createdAt, previousSyncAt) || isRecentPendingOrder) {
              const amount = formatCurrency(order.totalAmount);
              addNotification({
                type: 'order',
                audience: 'ADMIN',
                title: 'Nouvelle commande',
                message: `Commande ${order.orderNumber || ''} recue (${toStatusLabel(order.status, ORDER_STATUS_LABELS)})${amount ? ` - ${amount}` : ''}.`,
                href: '/admin/orders',
                createdAt: order.createdAt,
                dedupKey: `order.created:${order.id}`,
              });
            }
            return;
          }

          const previous = snapshotsRef.current.orders.get(order.id);
          if (!previous) {
            const amount = formatCurrency(order.totalAmount);
            addNotification({
              type: 'order',
              audience: 'ADMIN',
              title: 'Nouvelle commande',
              message: `Commande ${order.orderNumber || ''} recue (${toStatusLabel(order.status, ORDER_STATUS_LABELS)})${amount ? ` - ${amount}` : ''}.`,
              href: '/admin/orders',
              createdAt: order.createdAt,
              dedupKey: `order.created:${order.id}`,
            });
            return;
          }

          if (previous !== order.status) {
            addNotification({
              type: 'order',
              audience: 'ADMIN',
              title: 'Commande mise a jour',
              message: `Commande ${order.orderNumber || ''} est maintenant ${toStatusLabel(order.status, ORDER_STATUS_LABELS)}.`,
              href: '/admin/orders',
              dedupKey: `order.status.updated:${order.id}:${order.status}`,
            });
          }
        });

        events.forEach((event) => {
          nextEventMap.set(event.id, event.status);
          if (!emitChanges) {
            if (isAfterPivot(event.createdAt, previousSyncAt)) {
              addNotification({
                type: 'event',
                audience: 'ADMIN',
                title: 'Nouvel evenement',
                message: `${event.name || 'Evenement'} a ete cree.`,
                href: `/admin/events/${event.id}`,
                createdAt: event.createdAt,
                dedupKey: `event.created:${event.id}`,
              });
            }
            return;
          }

          const previous = snapshotsRef.current.events.get(event.id);
          if (!previous) {
            addNotification({
              type: 'event',
              audience: 'ADMIN',
              title: 'Nouvel evenement',
              message: `${event.name || 'Evenement'} a ete cree.`,
              href: `/admin/events/${event.id}`,
              createdAt: event.createdAt,
              dedupKey: `event.created:${event.id}`,
            });
            return;
          }

          if (previous !== event.status) {
            addNotification({
              type: 'event',
              audience: 'ADMIN',
              title: 'Statut evenement mis a jour',
              message: `${event.name || 'Evenement'} est ${toStatusLabel(event.status, EVENT_STATUS_LABELS)}.`,
              href: `/admin/events/${event.id}`,
              dedupKey: `event.status.updated:${event.id}:${event.status}`,
            });
          }
        });

        quotes.forEach((quote) => {
          nextQuoteMap.set(quote.id, quote.status);
          if (!emitChanges) {
            if (isAfterPivot(quote.createdAt, previousSyncAt)) {
              addNotification({
                type: 'quote',
                audience: 'ADMIN',
                title: 'Nouveau devis',
                message: `Devis ${quote.quoteNumber || ''} cree (${toStatusLabel(quote.status, QUOTE_STATUS_LABELS)}).`,
                href: '/admin/quotes',
                createdAt: quote.createdAt,
                dedupKey: `quote.created:${quote.id}`,
              });
            }
            return;
          }

          const previous = snapshotsRef.current.quotes.get(quote.id);
          if (!previous) {
            addNotification({
              type: 'quote',
              audience: 'ADMIN',
              title: 'Nouveau devis',
              message: `Devis ${quote.quoteNumber || ''} cree (${toStatusLabel(quote.status, QUOTE_STATUS_LABELS)}).`,
              href: '/admin/quotes',
              createdAt: quote.createdAt,
              dedupKey: `quote.created:${quote.id}`,
            });
            return;
          }

          if (previous !== quote.status) {
            addNotification({
              type: 'quote',
              audience: 'ADMIN',
              title: 'Devis mis a jour',
              message: `Devis ${quote.quoteNumber || ''} est ${toStatusLabel(quote.status, QUOTE_STATUS_LABELS)}.`,
              href: '/admin/quotes',
              dedupKey: `quote.status.updated:${quote.id}:${quote.status}`,
            });
          }
        });

        invoices.forEach((invoice) => {
          const invoiceStatus = invoice.status || 'PENDING';
          nextInvoiceMap.set(invoice.id, invoiceStatus);

          const shouldNotifyInvoice = ['PENDING', 'FAILED'].includes(invoiceStatus);
          if (!shouldNotifyInvoice) return;

          if (!emitChanges) {
            if (isAfterPivot(invoice.issuedAt, previousSyncAt)) {
              addNotification({
                type: 'invoice',
                audience: 'ADMIN',
                title: 'Nouvelle facture',
                message: `Facture ${invoice.invoiceNumber} creee (${toStatusLabel(invoiceStatus, INVOICE_STATUS_LABELS)}).`,
                href: '/admin/documents/factures',
                createdAt: invoice.issuedAt,
                dedupKey: `invoice.created:${invoice.id}`,
              });
            }
            return;
          }

          const previous = snapshotsRef.current.invoices.get(invoice.id);
          if (!previous) {
            addNotification({
              type: 'invoice',
              audience: 'ADMIN',
              title: 'Nouvelle facture',
              message: `Facture ${invoice.invoiceNumber} creee (${toStatusLabel(invoiceStatus, INVOICE_STATUS_LABELS)}).`,
              href: '/admin/documents/factures',
              createdAt: invoice.issuedAt,
              dedupKey: `invoice.created:${invoice.id}`,
            });
            return;
          }

          if (previous !== invoiceStatus) {
            addNotification({
              type: 'invoice',
              audience: 'ADMIN',
              title: 'Facture mise a jour',
              message: `Facture ${invoice.invoiceNumber} est ${toStatusLabel(invoiceStatus, INVOICE_STATUS_LABELS)}.`,
              href: '/admin/documents/factures',
              dedupKey: `invoice.status.updated:${invoice.id}:${invoiceStatus}`,
            });
          }
        });

        snapshotsRef.current.orders = nextOrderMap;
        snapshotsRef.current.events = nextEventMap;
        snapshotsRef.current.quotes = nextQuoteMap;
        snapshotsRef.current.invoices = nextInvoiceMap;
        setAdminLastSyncAt(Date.now());
      } catch {
        // Keep existing notifications if fetch fails.
      }
    };

    void syncSnapshots(false);
    const intervalId = window.setInterval(() => {
      void syncSnapshots(true);
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [addNotification, clearAdminNotifications, user]);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.07),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_34%),#f8fafc]">
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
        <div className="flex flex-col flex-grow min-h-0 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-[8px_0_32px_-20px_rgba(2,6,23,0.25)]">
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
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/70 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden">
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">Console administration</p>
              <span className="font-display text-base sm:text-lg font-medium text-gray-900 truncate block">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadByType.orders > 0 && (
              <Link
                to="/admin/orders"
                className="hidden sm:inline-flex items-center rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {unreadByType.orders} commande(s)
              </Link>
            )}
            {unreadByType.events > 0 && (
              <Link
                to="/admin/events"
                className="hidden md:inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                {unreadByType.events} evenement(s)
              </Link>
            )}
            {unreadByType.invoices > 0 && (
              <Link
                to="/admin/documents/factures"
                className="hidden lg:inline-flex items-center rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {unreadByType.invoices} facture(s)
              </Link>
            )}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title={unreadAdminCount > 0 ? `${unreadAdminCount} notification(s) non lue(s)` : 'Notifications admin'}
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-expanded={notificationsOpen}
                aria-label="Ouvrir les notifications admin"
              >
                <BellIcon className="h-4.5 w-4.5" />
                {unreadAdminCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                    {unreadAdminCount > 9 ? '9+' : unreadAdminCount}
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
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Notifications admin</p>
                        <p className="text-[11px] text-gray-500">Nouveautes commandes, devis, evenements et factures</p>
                      </div>
                      {unreadAdminCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Tout lire
                        </button>
                      ) : (
                        <Link
                          to="/admin/documents/factures"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Voir factures
                        </Link>
                      )}
                    </div>

                    {visibleAdminNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {visibleAdminNotifications.map((item) => (
                          <Link
                            key={item.id}
                            to={item.href || '/admin'}
                            onClick={() => {
                              markAsRead(item.id);
                              setNotificationsOpen(false);
                            }}
                            className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              item.read ? 'bg-white' : 'bg-primary-50/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800">{item.title}</p>
                              <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatRelativeTime(item.createdAt)}</span>
                            </div>
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
