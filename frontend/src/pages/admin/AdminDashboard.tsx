import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSiteStore } from '@/stores/site.store';
import PlatsDuJourManager from '@/components/home/PlatsDuJourManager';
import { 
  ShoppingBagIcon, 
  CalendarDaysIcon, 
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { orderService } from '@/services/order.service';
import { eventService } from '@/services/event.service';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui';
import { motion } from 'framer-motion';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  totalUsers: number;
  totalEvents: number;
  pendingOrders: number;
  pendingQuotes: number;
  monthOrders: number;
  monthEvents: number;
  todayOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  completionRate: number;
  averageProcessingHours: number;
  quoteConversionRate: number;
  avgQuoteResponseHours: number;
  avgEventProcessingHours: number;
  topPlats: Array<{
    platName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [ordersStatsRes, eventsStatsRes, usersRes] = await Promise.all([
        orderService.getOrderStats(),
        eventService.getEventStats(),
        api.get('/users'),
      ]);

      const orderStats = ordersStatsRes?.data || {};
      const eventStats = eventsStatsRes?.data || {};
      const users = usersRes?.data?.data || [];

      return {
        totalOrders: orderStats.totalOrders || 0,
        totalRevenue: orderStats.totalRevenue || 0,
        monthRevenue: orderStats.monthRevenue || 0,
        totalUsers: users.length,
        totalEvents: eventStats.totalEvents || 0,
        pendingOrders: orderStats.pendingOrders || 0,
        pendingQuotes: eventStats.pendingQuotes || 0,
        monthOrders: orderStats.monthOrders || 0,
        monthEvents: eventStats.monthEvents || 0,
        todayOrders: orderStats.todayOrders || 0,
        todayRevenue: orderStats.todayRevenue || 0,
        averageOrderValue: orderStats.averageOrderValue || 0,
        completionRate: orderStats.completionRate || 0,
        averageProcessingHours: orderStats.averageProcessingHours || 0,
        quoteConversionRate: eventStats.quoteConversionRate || 0,
        avgQuoteResponseHours: eventStats.avgQuoteResponseHours || 0,
        avgEventProcessingHours: eventStats.avgEventProcessingHours || 0,
        topPlats: orderStats.topPlats || [],
      };
    },
    staleTime: 30 * 1000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Commandes totales',
      value: stats?.totalOrders ?? 0,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      change: `${(stats?.todayRevenue ?? 0).toFixed(2)} DT aujourd'hui`,
      changePositive: true,
    },
    {
      title: 'Revenu total',
      value: `${(stats?.totalRevenue ?? 0).toFixed(2)} DT`,
      icon: BanknotesIcon,
      color: 'bg-green-500',
      change: `${(stats?.monthRevenue ?? 0).toFixed(2)} DT ce mois`,
      changePositive: true,
    },
    {
      title: 'Commandes en attente',
      value: stats?.pendingOrders ?? 0,
      icon: ShoppingBagIcon,
      color: 'bg-yellow-500',
      change: null,
      changePositive: false,
    },
    {
      title: 'Événements',
      value: stats?.totalEvents ?? 0,
      icon: CalendarDaysIcon,
      color: 'bg-purple-500',
      change: `${stats?.pendingQuotes ?? 0} devis en attente`,
      changePositive: true,
    },
    {
      title: 'Panier moyen',
      value: `${(stats?.averageOrderValue ?? 0).toFixed(2)} DT`,
      icon: BanknotesIcon,
      color: 'bg-cyan-500',
      change: `${(stats?.averageProcessingHours ?? 0).toFixed(1)}h délai moyen`,
      changePositive: true,
    },
    {
      title: 'Commandes aujourd’hui',
      value: stats?.todayOrders ?? 0,
      icon: ShoppingBagIcon,
      color: 'bg-indigo-500',
      change: `${(stats?.quoteConversionRate ?? 0).toFixed(1)}% conversion devis`,
      changePositive: true,
    },
  ];

  const professionalLinks = [
    { label: 'Factures', to: '/admin/documents/factures', icon: '🧾' },
    { label: 'Bons de commande', to: '/admin/documents/purchase-orders', icon: '📄' },
    { label: 'Avoirs client', to: '/admin/documents/credit-notes', icon: '↩️' },
    { label: 'AI Scanner', to: '/admin/documents/ai-scanner', icon: '🤖' },
    { label: 'Mouvements de stock', to: '/admin/stock/movements', icon: '🔁' },
    { label: 'Inventaire', to: '/admin/stock/take', icon: '📋' },
    { label: 'Report Generator', to: '/admin/reports/generator', icon: '📊' },
    { label: 'AI Report Generate', to: '/admin/reports/ai', icon: '✨' },
    { label: 'Fournisseurs', to: '/admin/suppliers', icon: '🚚' },
    { label: 'Paiements et caisse', to: '/admin/finance/payments-cash', icon: '💵' },
    { label: 'Audit logs', to: '/admin/finance/audit-logs', icon: '🛡️' },
    { label: 'Dépenses', to: '/admin/finance/expenses', icon: '💸' },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-gray-900/90">Tableau de bord</h1>
        <p className="text-gray-400 mt-1">Vue d'ensemble de votre activité</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              {stat.change && (
                <div className={`flex items-center text-sm ${
                  stat.changePositive ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {stat.changePositive ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {stat.change}
                </div>
              )}
            </div>
            <p className="text-2xl font-medium text-gray-900/90">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/admin/plats"
              className="bg-transparent/60 hover:bg-primary-500/10 rounded-lg p-4 text-center transition-all border border-gray-200 hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-2xl block mb-2">🍽️</span>
              <span className="text-gray-700 text-sm font-medium">Gérer les plats</span>
            </Link>
            <Link
              to="/admin/orders"
              className="bg-transparent/60 hover:bg-primary-500/10 rounded-lg p-4 text-center transition-all border border-gray-200 hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-2xl block mb-2">📦</span>
              <span className="text-gray-700 text-sm font-medium">Gérer les commandes</span>
            </Link>
            <Link
              to="/admin/events"
              className="bg-transparent/60 hover:bg-primary-500/10 rounded-lg p-4 text-center transition-all border border-gray-200 hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-2xl block mb-2">📅</span>
              <span className="text-gray-700 text-sm font-medium">Gérer les événements</span>
            </Link>
            <Link
              to="/admin/categories"
              className="bg-transparent/60 hover:bg-primary-500/10 rounded-lg p-4 text-center transition-all border border-gray-200 hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-2xl block mb-2">📁</span>
              <span className="text-gray-700 text-sm font-medium">Gérer les catégories</span>
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">KPI Business Avancés</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Devis acceptés</span>
              <span className="font-medium text-gray-900">{(stats?.quoteConversionRate ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Délai réponse devis</span>
              <span className="font-medium text-gray-900">{(stats?.avgQuoteResponseHours ?? 0).toFixed(1)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Délai traitement événement</span>
              <span className="font-medium text-gray-900">{(stats?.avgEventProcessingHours ?? 0).toFixed(1)} h</span>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Top plats (ventes)</h3>
            <div className="space-y-2">
              {(stats?.topPlats || []).length === 0 ? (
                <p className="text-sm text-gray-400">Pas encore de ventes livrées</p>
              ) : (
                stats!.topPlats.map((plat, index) => (
                  <div key={`${plat.platName}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate pr-3">{index + 1}. {plat.platName}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">{plat.quantitySold} | {plat.revenue.toFixed(2)} DT</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="glass-card p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Modules professionnels</h2>
            <p className="text-sm text-gray-500 mt-1">Raccourcis vers documents, stock, finance, reporting et IA</p>
          </div>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
            Nouveau
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {professionalLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 transition-all hover:border-primary-300 hover:bg-primary-50/40"
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <p className="mt-2 text-sm font-medium text-gray-800">{item.label}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Plats du Jour Manager */}
      <PlatsDuJourManager />

      {/* Today's Prep — Kitchen Production Sheet */}
      <TodaysPrepSection />
    </div>
  );
}

function TodaysPrepSection() {
  const { config } = useSiteStore();
  const { data: todaysOrders, isLoading } = useQuery<any[]>({
    queryKey: ['admin-todays-orders'],
    queryFn: async () => {
      const res = await orderService.getAllOrders(1, 100);
      const orders = res?.data || [];
      const today = new Date().toISOString().split('T')[0];
      return orders.filter((o: any) => {
        const deliveryDate = o.deliveryDate ? new Date(o.deliveryDate).toISOString().split('T')[0] : null;
        const orderDate = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : null;
        return (deliveryDate === today || orderDate === today) && o.status !== 'CANCELLED';
      });
    },
    staleTime: 60 * 1000,
  });

  // Aggregate items across all today's orders
  const prepItems: Record<string, { name: string; quantity: number; orders: number }> = {};
  (todaysOrders || []).forEach((order: any) => {
    (order.items || []).forEach((item: any) => {
      const key = item.platName || item.platId;
      if (!prepItems[key]) {
        prepItems[key] = { name: item.platName, quantity: 0, orders: 0 };
      }
      prepItems[key].quantity += item.quantity;
      prepItems[key].orders += 1;
    });
  });

  const sortedPrep = Object.values(prepItems).sort((a, b) => b.quantity - a.quantity);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">🍳 Préparation du jour</h2>
          <p className="text-sm text-gray-400">Plats à préparer aujourd'hui — {todaysOrders?.length || 0} commande(s)</p>
        </div>
        <div className="flex items-center gap-3">
          {sortedPrep.length > 0 && (
            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('fr-FR');
                const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Fiche de production — ${today}</title>
                  <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; }
                    h1 { font-size: 20px; color: #b5854b; border-bottom: 3px solid #b5854b; padding-bottom: 10px; }
                    .date { font-size: 13px; color: #888; margin: 8px 0 20px; }
                    .item { display: flex; align-items: center; gap: 15px; padding: 10px 15px; margin: 4px 0; background: #fafaf8; border-radius: 8px; border-left: 4px solid #b5854b; }
                    .qty { font-size: 22px; font-weight: 700; color: #b5854b; min-width: 50px; text-align: center; }
                    .name { font-size: 14px; color: #333; font-weight: 500; }
                    .orders { font-size: 11px; color: #888; }
                    .checkbox { width: 18px; height: 18px; border: 2px solid #ccc; border-radius: 4px; margin-left: auto; }
                    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; text-align: center; }
                    @media print { body { padding: 10px; } }
                  </style>
                </head><body>
                  <h1>🍳 Fiche de Production — ${config.siteName}</h1>
                  <div class="date">${today} · ${todaysOrders?.length || 0} commande(s)</div>
                  ${sortedPrep.map(item => `
                    <div class="item">
                      <div class="qty">${item.quantity}x</div>
                      <div>
                        <div class="name">${item.name}</div>
                        <div class="orders">dans ${item.orders} commande(s)</div>
                      </div>
                      <div class="checkbox"></div>
                    </div>
                  `).join('')}
                  <div class="footer">${config.siteName} — Fiche de production quotidienne</div>
                </body></html>`;
                const w = window.open('', '_blank', 'width=650,height=600');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <PrinterIcon className="h-4 w-4" />
              Imprimer
            </button>
          )}
          <Link to="/admin/orders" className="text-sm text-primary-500 hover:text-primary-600 transition-colors">
            Voir tout →
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : sortedPrep.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl block mb-2">✨</span>
          <p className="text-gray-400 text-sm">Aucune commande pour aujourd'hui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPrep.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-primary-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-medium text-primary-500 w-12 text-center">{item.quantity}x</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">dans {item.orders} commande(s)</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
