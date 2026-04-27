import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SparklesIcon, PrinterIcon, ClipboardDocumentIcon,
  ExclamationTriangleIcon, CheckCircleIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  CubeIcon, CurrencyDollarIcon, LightBulbIcon,
} from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { eventService } from '@/services/event.service';
import { catalogService, type Expense } from '@/services/catalog.service';
import { LoadingSpinner, Button } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';
import toast from 'react-hot-toast';

function sanitize(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type ReportData = {
  generatedAt: Date;
  orders: {
    total: number; delivered: number; pending: number; cancelled: number; thisMonth: number;
    totalRevenue: number; monthRevenue: number; avgOrderValue: number; cancellationRate: number;
  };
  finance: {
    totalExpenses: number; paidExpenses: number; pendingExpenseCount: number;
    margin: number; marginRate: number | null;
  };
  stock: {
    totalIngredients: number; lowStockCount: number;
    lowStockItems: Array<{ name: string; quantity: number; unit: string }>;
  };
  events: { totalEvents: number; pendingQuotes: number; quoteConversionRate: number | null };
  alerts: Array<{ type: 'warning' | 'danger'; message: string }>;
  recommendations: string[];
};

function KPICard({ label, value, subtitle, icon: Icon, color = 'gray' }: {
  label: string; value: string; subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: 'gray' | 'green' | 'red' | 'blue' | 'amber' | 'purple';
}) {
  const bgMap: Record<string, string> = {
    gray: 'border-gray-200 bg-gray-50/80', green: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50', blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50', purple: 'border-purple-200 bg-purple-50',
  };
  const iconMap: Record<string, string> = {
    gray: 'text-gray-400', green: 'text-emerald-500', red: 'text-red-500',
    blue: 'text-blue-500', amber: 'text-amber-500', purple: 'text-purple-500',
  };
  return (
    <div className={`rounded-2xl border p-4 ${bgMap[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <Icon className={`h-6 w-6 flex-shrink-0 ${iconMap[color]}`} />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
        <Icon className="h-4.5 w-4.5 text-primary-600" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">{title}</h3>
    </div>
  );
}

export default function AdminAIReportPage() {
  const { config } = useSiteStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-report-data'],
    queryFn: async () => {
      const [ordersRes, eventsStatsRes, statsRes, expensesRes, stockRes] = await Promise.all([
        orderService.getAllOrders(1, 500),
        eventService.getEventStats(),
        orderService.getOrderStats(),
        catalogService.getExpenses(),
        catalogService.getAllIngredientsStock(),
      ]);
      return {
        orders: (ordersRes.data || []) as Order[],
        eventStats: eventsStatsRes?.data || {},
        orderStats: statsRes?.data || {},
        expenses: (expensesRes.data || []) as Expense[],
        stock: (stockRes.data || []) as Array<{ name: string; quantity: number; isLowStock: boolean; unit: string }>,
      };
    },
    staleTime: 60 * 1000,
  });

  const generateReport = async () => {
    if (!data) return;
    setIsGenerating(true);

    const now = new Date();
    const thisMonthOrders = data.orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const deliveredOrders = data.orders.filter((o) => o.status === 'DELIVERED');
    const cancelledOrders = data.orders.filter((o) => o.status === 'CANCELLED');
    const pendingOrders = data.orders.filter((o) => o.status === 'PENDING');
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
    const monthRevenue = thisMonthOrders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.totalAmount, 0);
    const paidExpenses = data.expenses.filter((e) => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
    const lowStockItems = data.stock.filter((s) => s.isLowStock);
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    const cancellationRate = data.orders.length > 0 ? (cancelledOrders.length / data.orders.length) * 100 : 0;
    const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
    const margin = totalRevenue - paidExpenses;
    const marginRate = totalRevenue > 0 ? (margin / totalRevenue) * 100 : null;

    const alerts: Array<{ type: 'warning' | 'danger'; message: string }> = [];
    if (cancellationRate > 15) alerts.push({ type: 'danger', message: `Taux d'annulation élevé (${cancellationRate.toFixed(1)}%). Investiguer les causes.` });
    if (pendingOrders.length > 5) alerts.push({ type: 'warning', message: `${pendingOrders.length} commandes en attente. Prioriser le traitement.` });
    if (margin < 0) alerts.push({ type: 'danger', message: 'Marge nette négative. Revoir la stratégie de prix ou réduire les dépenses.' });

    const recommendations: string[] = [];
    if (lowStockItems.length > 0) recommendations.push(`Réapprovisionner ${lowStockItems.length} ingrédient(s) en stock faible.`);
    if (pendingOrders.length > 0) recommendations.push(`Traiter les ${pendingOrders.length} commande(s) en attente.`);
    if (cancellationRate > 10) recommendations.push(`Analyser les causes d'annulation pour réduire le taux à < 10%.`);
    if (margin < 0) recommendations.push(`La marge est négative. Revoir la stratégie de prix ou réduire les dépenses.`);
    if (avgOrderValue < 50) recommendations.push(`Promouvoir les formules et menus complets pour augmenter le panier moyen.`);

    setReportData({
      generatedAt: now,
      orders: { total: data.orders.length, delivered: deliveredOrders.length, pending: pendingOrders.length, cancelled: cancelledOrders.length, thisMonth: thisMonthOrders.length, totalRevenue, monthRevenue, avgOrderValue, cancellationRate },
      finance: { totalExpenses, paidExpenses, pendingExpenseCount: data.expenses.filter((e) => e.status !== 'PAID' && e.status !== 'REJECTED').length, margin, marginRate },
      stock: { totalIngredients: data.stock.length, lowStockCount: lowStockItems.length, lowStockItems: lowStockItems.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })) },
      events: { totalEvents: data.eventStats.totalEvents || 0, pendingQuotes: data.eventStats.pendingQuotes || 0, quoteConversionRate: data.eventStats.quoteConversionRate ? Number(data.eventStats.quoteConversionRate) : null },
      alerts, recommendations,
    });
    setIsGenerating(false);
  };

  const buildPlainText = (): string => {
    if (!reportData) return '';
    const r = reportData;
    const lines: string[] = [
      `RAPPORT EXECUTIF — ${config.siteName}`,
      `Genere le ${r.generatedAt.toLocaleDateString('fr-FR')} a ${r.generatedAt.toLocaleTimeString('fr-FR')}`,
      '', `PERFORMANCE COMMERCIALE`,
      `Commandes totales : ${r.orders.total}`, `  Livrees : ${r.orders.delivered}`, `  En attente : ${r.orders.pending}`, `  Annulees : ${r.orders.cancelled}`, `  Ce mois : ${r.orders.thisMonth}`,
      `CA total : ${r.orders.totalRevenue.toFixed(2)} DT`, `CA ce mois : ${r.orders.monthRevenue.toFixed(2)} DT`,
      `Panier moyen : ${r.orders.avgOrderValue.toFixed(2)} DT`, `Taux d'annulation : ${r.orders.cancellationRate.toFixed(1)}%`,
      '', `SITUATION FINANCIERE`,
      `Depenses totales : ${r.finance.totalExpenses.toFixed(2)} DT`, `  Payees : ${r.finance.paidExpenses.toFixed(2)} DT`,
      `  En attente : ${r.finance.pendingExpenseCount} depense(s)`,
      `Marge nette : ${r.finance.margin.toFixed(2)} DT${r.finance.marginRate !== null ? ` (${r.finance.marginRate.toFixed(1)}%)` : ''}`,
      '', `SITUATION DES STOCKS`, `Ingredients en stock : ${r.stock.totalIngredients}`, `Alertes stock faible : ${r.stock.lowStockCount}`,
    ];
    if (r.stock.lowStockItems.length > 0) {
      lines.push(`Ingredients en alerte :`);
      r.stock.lowStockItems.forEach((item) => lines.push(`  - ${item.name} : ${item.quantity} ${item.unit} restant(s)`));
    }
    lines.push('', `EVENEMENTS`, `Total : ${r.events.totalEvents}`, `Devis en attente : ${r.events.pendingQuotes}`);
    if (r.events.quoteConversionRate !== null) lines.push(`Taux de conversion devis : ${r.events.quoteConversionRate.toFixed(1)}%`);
    if (r.alerts.length > 0) { lines.push('', `ALERTES`); r.alerts.forEach((a) => lines.push(`  [${a.type === 'danger' ? 'CRITIQUE' : 'ATTENTION'}] ${a.message}`)); }
    if (r.recommendations.length > 0) { lines.push('', `RECOMMANDATIONS`); r.recommendations.forEach((rec, i) => lines.push(`  ${i + 1}. ${rec}`)); }
    lines.push('', `— Fin du rapport —`);
    return lines.join('\n');
  };

  const handlePrint = () => {
    if (!reportData) return;
    const r = reportData;
    const date = r.generatedAt.toLocaleDateString('fr-FR');
    const time = r.generatedAt.toLocaleTimeString('fr-FR');
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Rapport IA — ${sanitize(config.siteName)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;max-width:900px;margin:0 auto;color:#1f2937}
        .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #b5854b}
        .logo{font-size:24px;font-weight:700;color:#b5854b}.logo-sub{font-size:12px;color:#9ca3af;margin-top:4px}
        .doc-type{font-size:16px;font-weight:600;text-align:right}.doc-date{font-size:12px;color:#9ca3af;margin-top:4px;text-align:right}
        h2{font-size:14px;color:#b5854b;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin:28px 0 14px;text-transform:uppercase;letter-spacing:1.5px}
        .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px}
        .kpi{background:#fafaf8;border-radius:10px;padding:16px;border-left:4px solid #b5854b}
        .kpi-label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px}
        .kpi-value{font-size:22px;font-weight:700;color:#1f2937;margin-top:4px}
        .kpi-value.green{color:#059669}.kpi-value.red{color:#dc2626}
        .alert{padding:12px 16px;border-radius:8px;margin:8px 0;font-size:13px}
        .alert.danger{background:#fef2f2;border-left:4px solid #dc2626;color:#991b1b}
        .alert.warning{background:#fffbeb;border-left:4px solid #f59e0b;color:#92400e}
        .rec{padding:8px 12px;border-radius:6px;background:#f0fdf4;border-left:3px solid #059669;margin:6px 0;font-size:13px;color:#166534}
        .stock-item{padding:6px 12px;border-radius:6px;background:#fef2f2;margin:4px 0;font-size:13px;color:#991b1b}
        .footer{margin-top:30px;padding-top:10px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa}
        @media print{body{padding:15px}}
      </style>
    </head><body>
      <div class="header">
        <div><div class="logo">${sanitize(config.siteName)}</div><div class="logo-sub">Rapport executif IA</div></div>
        <div><div class="doc-type">RAPPORT EXECUTIF</div><div class="doc-date">${date} a ${time}</div></div>
      </div>
      <h2>Performance commerciale</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Commandes totales</div><div class="kpi-value">${r.orders.total}</div></div>
        <div class="kpi"><div class="kpi-label">CA Total</div><div class="kpi-value green">${r.orders.totalRevenue.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">CA Ce mois</div><div class="kpi-value green">${r.orders.monthRevenue.toFixed(2)} DT</div></div>
      </div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Livrees</div><div class="kpi-value">${r.orders.delivered}</div></div>
        <div class="kpi"><div class="kpi-label">En attente</div><div class="kpi-value">${r.orders.pending}</div></div>
        <div class="kpi"><div class="kpi-label">Panier moyen</div><div class="kpi-value">${r.orders.avgOrderValue.toFixed(2)} DT</div></div>
      </div>
      <h2>Situation financiere</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Depenses totales</div><div class="kpi-value red">${r.finance.totalExpenses.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Payees</div><div class="kpi-value">${r.finance.paidExpenses.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Marge nette</div><div class="kpi-value ${r.finance.margin >= 0 ? 'green' : 'red'}">${r.finance.margin.toFixed(2)} DT</div></div>
      </div>
      ${r.finance.marginRate !== null ? `<div class="kpi-grid"><div class="kpi"><div class="kpi-label">Taux de marge</div><div class="kpi-value ${r.finance.marginRate >= 0 ? 'green' : 'red'}">${r.finance.marginRate.toFixed(1)}%</div></div></div>` : ''}
      <h2>Situation des stocks</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Ingredients en stock</div><div class="kpi-value">${r.stock.totalIngredients}</div></div>
        <div class="kpi"><div class="kpi-label">Alertes stock faible</div><div class="kpi-value ${r.stock.lowStockCount > 0 ? 'red' : 'green'}">${r.stock.lowStockCount}</div></div>
      </div>
      ${r.stock.lowStockItems.map((i) => `<div class="stock-item">${sanitize(i.name)} — ${i.quantity} ${sanitize(i.unit)} restant(s)</div>`).join('')}
      <h2>Evenements</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Total evenements</div><div class="kpi-value">${r.events.totalEvents}</div></div>
        <div class="kpi"><div class="kpi-label">Devis en attente</div><div class="kpi-value">${r.events.pendingQuotes}</div></div>
        ${r.events.quoteConversionRate !== null ? `<div class="kpi"><div class="kpi-label">Taux de conversion</div><div class="kpi-value">${r.events.quoteConversionRate.toFixed(1)}%</div></div>` : ''}
      </div>
      ${r.alerts.length > 0 ? `<h2>Alertes</h2>${r.alerts.map((a) => `<div class="alert ${a.type}">${a.type === 'danger' ? 'CRITIQUE' : 'ATTENTION'} : ${sanitize(a.message)}</div>`).join('')}` : ''}
      ${r.recommendations.length > 0 ? `<h2>Recommandations</h2>${r.recommendations.map((rec) => `<div class="rec">${sanitize(rec)}</div>`).join('')}` : ''}
      <div class="footer">${sanitize(config.siteName)} — Rapport genere le ${date} a ${time}</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=950,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const handleCopy = () => {
    const text = buildPlainText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Rapport copié !');
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const r = reportData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Rapport IA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Génération intelligente de rapports exécutifs à partir de vos données
          </p>
        </div>
        {r && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
              Copier
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <PrinterIcon className="h-4 w-4 mr-1" />
              Imprimer
            </Button>
            <Button size="sm" onClick={generateReport}>
              <SparklesIcon className="h-4 w-4 mr-1" />
              Regénérer
            </Button>
          </div>
        )}
      </div>

      {isGenerating ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="mt-4 text-sm font-medium text-primary-600">Analyse en cours...</p>
          <p className="mt-1 text-xs text-gray-400">L'IA analyse vos commandes, dépenses et stocks</p>
        </div>
      ) : !r ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <SparklesIcon className="mx-auto h-12 w-12 text-primary-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Prêt à générer votre rapport</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
            L'IA va analyser vos commandes, dépenses, stocks et événements pour
            produire un rapport exécutif avec des recommandations personnalisées.
          </p>
          <Button onClick={generateReport} className="mt-4">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Générer le rapport
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report header */}
          <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                  <SparklesIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-800">Rapport exécutif — {config.siteName}</p>
                  <p className="text-xs text-primary-600/70">
                    Généré le {r.generatedAt.toLocaleDateString('fr-FR')} à {r.generatedAt.toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
              <CheckCircleIcon className="h-6 w-6 text-primary-500" />
            </div>
          </div>

          {/* Alerts */}
          {r.alerts.length > 0 && (
            <div className="space-y-2">
              {r.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    alert.type === 'danger'
                      ? 'border-red-200 bg-red-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <ExclamationTriangleIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      alert.type === 'danger' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {alert.type === 'danger' ? 'Critique' : 'Attention'}
                    </p>
                    <p className={`text-sm mt-0.5 ${
                      alert.type === 'danger' ? 'text-red-800' : 'text-amber-800'
                    }`}>
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Commercial Performance */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <SectionHeader icon={ArrowTrendingUpIcon} title="Performance commerciale" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              <KPICard label="Commandes" value={String(r.orders.total)} subtitle={`${r.orders.thisMonth} ce mois`} icon={ArrowTrendingUpIcon} color="blue" />
              <KPICard label="Livrées" value={String(r.orders.delivered)} icon={CheckCircleIcon} color="green" />
              <KPICard label="En attente" value={String(r.orders.pending)} icon={ExclamationTriangleIcon} color={r.orders.pending > 5 ? 'amber' : 'gray'} />
              <KPICard label="Annulées" value={String(r.orders.cancelled)} icon={ArrowTrendingDownIcon} color="red" />
              <KPICard label="Taux annulation" value={`${r.orders.cancellationRate.toFixed(1)}%`} icon={ArrowTrendingDownIcon} color={r.orders.cancellationRate > 15 ? 'red' : 'gray'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <KPICard label="CA Total" value={`${r.orders.totalRevenue.toFixed(2)} DT`} icon={CurrencyDollarIcon} color="green" />
              <KPICard label="CA Ce mois" value={`${r.orders.monthRevenue.toFixed(2)} DT`} icon={CurrencyDollarIcon} color="green" />
              <KPICard label="Panier moyen" value={`${r.orders.avgOrderValue.toFixed(2)} DT`} icon={CurrencyDollarIcon} color="blue" />
            </div>
          </div>

          {/* Finance */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <SectionHeader icon={CurrencyDollarIcon} title="Situation financière" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Dépenses totales" value={`${r.finance.totalExpenses.toFixed(2)} DT`} icon={CurrencyDollarIcon} color="red" />
              <KPICard label="Payées" value={`${r.finance.paidExpenses.toFixed(2)} DT`} icon={CheckCircleIcon} color="green" />
              <KPICard label="En attente" value={`${r.finance.pendingExpenseCount} dépense(s)`} icon={ExclamationTriangleIcon} color="amber" />
              <KPICard
                label="Marge nette"
                value={`${r.finance.margin.toFixed(2)} DT`}
                subtitle={r.finance.marginRate !== null ? `Taux: ${r.finance.marginRate.toFixed(1)}%` : undefined}
                icon={r.finance.margin >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
                color={r.finance.margin >= 0 ? 'green' : 'red'}
              />
            </div>
          </div>

          {/* Stock */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <SectionHeader icon={CubeIcon} title="Situation des stocks" />
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Ingrédients en stock" value={String(r.stock.totalIngredients)} icon={CubeIcon} color="blue" />
              <KPICard label="Alertes stock faible" value={String(r.stock.lowStockCount)} icon={ExclamationTriangleIcon} color={r.stock.lowStockCount > 0 ? 'red' : 'green'} />
            </div>
            {r.stock.lowStockItems.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Ingrédients en alerte</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {r.stock.lowStockItems.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-red-800 truncate">{item.name}</span>
                      <span className="ml-auto text-xs text-red-600 flex-shrink-0">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Events */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <SectionHeader icon={ArrowTrendingUpIcon} title="Événements" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard label="Total événements" value={String(r.events.totalEvents)} icon={ArrowTrendingUpIcon} color="purple" />
              <KPICard label="Devis en attente" value={String(r.events.pendingQuotes)} icon={ExclamationTriangleIcon} color="amber" />
              {r.events.quoteConversionRate !== null && (
                <KPICard label="Taux de conversion" value={`${r.events.quoteConversionRate.toFixed(1)}%`} icon={CheckCircleIcon} color="green" />
              )}
            </div>
          </div>

          {/* Recommendations */}
          {r.recommendations.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
              <SectionHeader icon={LightBulbIcon} title="Recommandations IA" />
              <div className="space-y-2">
                {r.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <p className="text-sm text-emerald-900">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
