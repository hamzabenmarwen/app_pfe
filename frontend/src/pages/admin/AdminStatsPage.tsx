import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ClockIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui';
import { orderService } from '@/services/order.service';
import { eventService } from '@/services/event.service';

import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Colour palette for charts                                          */
/* ------------------------------------------------------------------ */
const CHART_COLORS = [
  '#b5854b', '#d4a76a', '#8b6914', '#c9956b', '#a67c52',
  '#7c5e3c', '#e6c47f', '#9b7653', '#6b4226', '#d4a76a',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PREPARING: '#8b5cf6',
  READY: '#06b6d4',
  DELIVERING: '#6366f1',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: 'Mariage',
  CORPORATE: 'Corporate',
  BIRTHDAY: 'Anniversaire',
  GRADUATION: 'Remise de diplôme',
  BABY_SHOWER: 'Baby Shower',
  FUNERAL: 'Funérailles',
  RELIGIOUS: 'Religieux',
  COCKTAIL: 'Cocktail',
  CONFERENCE: 'Conférence',
  PRIVATE: 'Privé',
  OTHER: 'Autre',
};

/* ------------------------------------------------------------------ */
/*  Helper: group orders by date / status / category                   */
/* ------------------------------------------------------------------ */
function groupByDate(orders: any[]) {
  const map: Record<string, { date: string; revenue: number; orders: number }> = {};
  orders.forEach((o) => {
    const d = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    if (!map[d]) map[d] = { date: d, revenue: 0, orders: 0 };
    map[d].revenue += Number(o.totalAmount || 0);
    map[d].orders += 1;
  });
  return Object.values(map).slice(-14); // last 14 days
}

function groupByStatus(orders: any[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    map[o.status] = (map[o.status] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({
    name: name.charAt(0) + name.slice(1).toLowerCase(),
    value,
    fill: STATUS_COLORS[name] || '#94a3b8',
  }));
}

function topPlatsByQuantity(orders: any[]) {
  const map: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item: any) => {
      const key = item.platName || item.platId;
      if (!map[key]) map[key] = { name: item.platName || 'Inconnu', qty: 0, revenue: 0 };
      map[key].qty += item.quantity;
      map[key].revenue += item.quantity * Number(item.unitPrice || 0);
    });
  });
  return Object.values(map)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);
}



function groupByDayOfWeek(orders: any[]) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const map: number[] = [0, 0, 0, 0, 0, 0, 0];
  orders.forEach((o) => {
    const d = new Date(o.createdAt).getDay();
    map[d] += 1;
  });
  return days.map((name, i) => ({ name, commandes: map[i] }));
}

function groupByHour(orders: any[]) {
  const map: number[] = new Array(24).fill(0);
  orders.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    map[h] += 1;
  });
  return map.map((count, h) => ({ hour: `${h}h`, commandes: count })).filter((_, i) => i >= 8 && i <= 23);
}

function groupEventsByType(events: any[]) {
  const map: Record<string, number> = {};
  events.forEach((e) => {
    const t = e.eventType || e.type || 'OTHER';
    map[t] = (map[t] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({
    name: EVENT_TYPE_LABELS[name] || name,
    value,
  }));
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenu')
            ? `${p.value.toFixed(2)} DT`
            : p.value}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function AdminStatsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Fetch all orders (we compute charts client-side)
  const { data: allOrders, isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ['admin-all-orders-stats'],
    queryFn: async () => {
      const res = await orderService.getAllOrders(1, 500);
      return res?.data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch stats summary
  const { data: stats, isLoading: loadingStats } = useQuery<any>({
    queryKey: ['admin-stats-overview'],
    queryFn: async () => {
      const [ordersStatsRes, eventsStatsRes] = await Promise.all([
        orderService.getOrderStats(),
        eventService.getEventStats(),
      ]);
      const os = ordersStatsRes?.data || {};
      const es = eventsStatsRes?.data || {};
      return { ...os, ...es };
    },
    staleTime: 30 * 1000,
  });

  // Fetch events for event charts
  const { data: allEvents } = useQuery<any[]>({
    queryKey: ['admin-all-events-stats'],
    queryFn: async () => {
      const res = await eventService.getAllEvents(1, 200);
      return res?.data || [];
    },
    staleTime: 60 * 1000,
  });

  const isLoading = loadingOrders || loadingStats;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const orders = allOrders || [];
  const events = allEvents || [];

  // Filter by period
  const now = new Date();
  const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const filteredOrders = orders.filter((o) => new Date(o.createdAt) >= cutoff);
  const filteredEvents = events.filter((e) => new Date(e.createdAt) >= cutoff);

  // Compute chart data
  const revenueByDay = groupByDate(filteredOrders);
  const statusDistribution = groupByStatus(filteredOrders);
  const topPlats = topPlatsByQuantity(filteredOrders);
  const dayOfWeek = groupByDayOfWeek(filteredOrders);
  const hourDistribution = groupByHour(filteredOrders);
  const eventsByType = groupEventsByType(filteredEvents);

  // Compute summary KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const avgOrder = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const deliveredCount = filteredOrders.filter((o) => o.status === 'DELIVERED').length;
  const completionRate = totalOrdersCount > 0 ? ((deliveredCount / totalOrdersCount) * 100) : 0;
  const cancelledCount = filteredOrders.filter((o) => o.status === 'CANCELLED').length;
  const cancelRate = totalOrdersCount > 0 ? ((cancelledCount / totalOrdersCount) * 100) : 0;

  const periodLabel = period === 'week' ? 'cette semaine' : period === 'month' ? 'ce mois' : 'cette année';

  const kpiCards = [
    {
      title: 'Chiffre d\'affaires',
      value: `${totalRevenue.toFixed(2)} DT`,
      sub: periodLabel,
      icon: BanknotesIcon,
      color: 'bg-emerald-500',
      gradient: 'from-emerald-500/10 to-emerald-500/5',
    },
    {
      title: 'Commandes',
      value: totalOrdersCount,
      sub: periodLabel,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      gradient: 'from-blue-500/10 to-blue-500/5',
    },
    {
      title: 'Panier moyen',
      value: `${avgOrder.toFixed(2)} DT`,
      sub: `sur ${totalOrdersCount} commandes`,
      icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500',
      gradient: 'from-purple-500/10 to-purple-500/5',
    },
    {
      title: 'Événements',
      value: filteredEvents.length,
      sub: `${events.length} total`,
      icon: CalendarDaysIcon,
      color: 'bg-amber-500',
      gradient: 'from-amber-500/10 to-amber-500/5',
    },
    {
      title: 'Taux de complétion',
      value: `${completionRate.toFixed(1)}%`,
      sub: `${deliveredCount} livrées`,
      icon: ChartBarIcon,
      color: 'bg-cyan-500',
      gradient: 'from-cyan-500/10 to-cyan-500/5',
    },
    {
      title: 'Taux d\'annulation',
      value: `${cancelRate.toFixed(1)}%`,
      sub: `${cancelledCount} annulées`,
      icon: ClockIcon,
      color: cancelRate > 20 ? 'bg-red-500' : 'bg-gray-400',
      gradient: cancelRate > 20 ? 'from-red-500/10 to-red-500/5' : 'from-gray-400/10 to-gray-400/5',
    },
  ];

  // Gauge data for conversion
  const conversionRate = stats?.quoteConversionRate || 0;
  const gaugeData = [
    { name: 'Conversion devis', value: conversionRate, fill: '#b5854b' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90 flex items-center gap-2">
            <ChartBarIcon className="h-7 w-7 text-primary-500" />
            Statistiques
          </h1>
          <p className="text-gray-400 mt-1">Analyse de performance et suivi d'activité</p>
        </motion.div>
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                period === p
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p === 'week' ? '7 jours' : p === 'month' ? '30 jours' : '12 mois'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className={`glass-card p-6 bg-gradient-to-br ${card.gradient} border border-gray-100`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-gray-400 font-light">{card.sub}</span>
            </div>
            <p className="text-2xl font-medium text-gray-900/90">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.title}</p>
          </motion.div>
        ))}
      </div>

      {/* ========== ROW 1: Revenue trend + Status distribution ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart — 2/3 width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Évolution du chiffre d'affaires</h3>
              <p className="text-xs text-gray-400 mt-1">Tendance des revenus et commandes par jour</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-medium text-primary-600">{totalRevenue.toFixed(2)} DT</p>
              <p className="text-xs text-gray-400">total {periodLabel}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b5854b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#b5854b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenu (DT)" stroke="#b5854b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="orders" name="Commandes" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Order Status Pie — 1/3 width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">Statut des commandes</h3>
          <p className="text-xs text-gray-400 mb-4">Répartition par état</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusDistribution.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ========== ROW 2: Top Plats + Events by Type ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Plats Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <FireIcon className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-medium text-gray-900">Top plats vendus</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Analyse des ventes par plat ({periodLabel})</p>
          {topPlats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <span className="text-4xl mb-2">📊</span>
              <p className="text-sm">Pas encore de données de ventes</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPlats} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  width={120}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="qty" name="Quantité vendue" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {topPlats.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Events by Type Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium text-gray-900">Événements par type</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Répartition des prestations événementielles</p>
          {eventsByType.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <span className="text-4xl mb-2">📅</span>
              <p className="text-sm">Aucun événement enregistré</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={eventsByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {eventsByType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-3">
                {eventsByType.map((e, i) => (
                  <span key={e.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {e.name} ({e.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ========== ROW 3: Day-of-Week + Hour Distribution ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">Commandes par jour de la semaine</h3>
          <p className="text-xs text-gray-400 mb-4">Identifiez les jours les plus actifs</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="commandes" name="Commandes" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {dayOfWeek.map((d, i) => (
                  <Cell key={i} fill={d.commandes === Math.max(...dayOfWeek.map(x => x.commandes)) ? '#b5854b' : '#d4a76a80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Hour Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">Commandes par heure</h3>
          <p className="text-xs text-gray-400 mb-4">Heures de pointe et creux d'activité</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={hourDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="commandes" name="Commandes" stroke="#b5854b" strokeWidth={2.5} dot={{ fill: '#b5854b', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ========== ROW 4: KPI Business Avancés + Conversion Gauge ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advanced KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-6">Indicateurs Avancés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Délai moyen de traitement', value: `${(stats?.averageProcessingHours || 0).toFixed(1)} h`, icon: '⏱️' },
              { label: 'Délai réponse devis', value: `${(stats?.avgQuoteResponseHours || 0).toFixed(1)} h`, icon: '📝' },
              { label: 'Taux conversion devis', value: `${(stats?.quoteConversionRate || 0).toFixed(1)}%`, icon: '📈' },
              { label: 'Délai traitement événement', value: `${(stats?.avgEventProcessingHours || 0).toFixed(1)} h`, icon: '📅' },
              { label: 'Commandes aujourd\'hui', value: stats?.todayOrders || 0, icon: '🛒' },
              { label: 'Revenu aujourd\'hui', value: `${(stats?.todayRevenue || 0).toFixed(2)} DT`, icon: '💰' },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80 hover:bg-primary-50/50 transition-colors">
                <span className="text-2xl">{kpi.icon}</span>
                <div>
                  <p className="text-lg font-medium text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-400">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Conversion Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">Conversion Devis</h3>
          <p className="text-xs text-gray-400 mb-4">Taux d'acceptation des devis</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              startAngle={180}
              endAngle={0}
              data={gaugeData}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={15}
                background={{ fill: '#f1f5f9' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-display font-medium text-primary-600 -mt-10">
            {conversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">des devis sont acceptés</p>
        </motion.div>
      </div>

      {/* ========== ROW 5: Top plats revenue table ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-medium text-gray-900 mb-2">📊 Tableau d'analyse des ventes par plat</h3>
        <p className="text-xs text-gray-400 mb-4">Données détaillées pour l'aide à la décision ({periodLabel})</p>
        {topPlats.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune donnée de ventes pour cette période</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Plat</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Quantité</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">% du total</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Tendance</th>
                </tr>
              </thead>
              <tbody>
                {topPlats.map((plat, i) => {
                  const pct = totalRevenue > 0 ? (plat.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={plat.name} className="border-b border-gray-100 hover:bg-primary-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${i < 3 ? 'bg-primary-500' : 'bg-gray-300'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{plat.name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{plat.qty}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{plat.revenue.toFixed(2)} DT</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-gray-500 text-xs">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <span className={`text-xs font-medium ${i < 3 ? 'text-emerald-500' : 'text-gray-400'}`}>
                          {i < 3 ? '🔥 Populaire' : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
