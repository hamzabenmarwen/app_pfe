import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { catalogService, type Expense } from '@/services/catalog.service';
import { LoadingSpinner, Button } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';

type ReportType = 'sales' | 'expenses' | 'combined';
type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';

function sanitize(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function AdminReportGeneratorPage() {
  const { config } = useSiteStore();
  const [reportType, setReportType] = useState<ReportType>('combined');
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['report-data'],
    queryFn: async () => {
      const [ordersRes, expensesRes, statsRes] = await Promise.all([
        orderService.getAllOrders(1, 500),
        catalogService.getExpenses(),
        orderService.getOrderStats(),
      ]);
      return {
        orders: (ordersRes.data || []) as Order[],
        expenses: (expensesRes.data || []) as Expense[],
        stats: statsRes?.data || {},
      };
    },
    staleTime: 60 * 1000,
  });

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    switch (period) {
      case 'week': start.setDate(now.getDate() - 7); break;
      case 'month': start.setMonth(now.getMonth() - 1); break;
      case 'quarter': start.setMonth(now.getMonth() - 3); break;
      case 'year': start.setFullYear(now.getFullYear() - 1); break;
    }
    return { start, end: now };
  };

  const filteredOrders = (data?.orders || []).filter((o) => {
    const { start } = getDateRange();
    return new Date(o.createdAt) >= start;
  });

  const filteredExpenses = (data?.expenses || []).filter((e) => {
    const { start } = getDateRange();
    return new Date(e.expenseDate) >= start;
  });

  const totalSales = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const deliveredSales = filteredOrders.filter((o) => o.status === 'DELIVERED').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = filteredExpenses.filter((e) => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
  const profit = deliveredSales - paidExpenses;

  const periodLabel: Record<ReportPeriod, string> = {
    week: '7 derniers jours',
    month: '30 derniers jours',
    quarter: '3 derniers mois',
    year: '12 derniers mois',
  };

  const generateHTML = (): string => {
    const now = new Date().toLocaleDateString('fr-FR');
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    const expenseByCat: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      expenseByCat[e.category] = (expenseByCat[e.category] || 0) + e.amount;
    });

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Rapport ${sanitize(config.siteName)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #b5854b; }
        .logo { font-size: 22px; font-weight: 700; color: #b5854b; }
        .logo-sub { font-size: 11px; color: #888; margin-top: 4px; }
        .doc-type { font-size: 18px; font-weight: 600; text-align: right; }
        .doc-date { font-size: 12px; color: #888; margin-top: 4px; text-align: right; }
        h2 { font-size: 15px; color: #b5854b; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; margin: 25px 0 12px; text-transform: uppercase; letter-spacing: 1px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .kpi { background: #fafaf8; border-radius: 8px; padding: 15px; border-left: 4px solid #b5854b; }
        .kpi-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .kpi-value { font-size: 22px; font-weight: 700; color: #333; margin-top: 4px; }
        .kpi-value.green { color: #059669; }
        .kpi-value.red { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #888; border-bottom: 2px solid #b5854b; }
        td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
        @media print { body { padding: 15px; } }
      </style>
    </head><body>
      <div class="header">
        <div><div class="logo">${sanitize(config.siteName)}</div><div class="logo-sub">Rapport d'activité</div></div>
        <div><div class="doc-type">RAPPORT D'ACTIVITÉ</div><div class="doc-date">${now} · ${periodLabel[period]}</div></div>
      </div>

      ${reportType !== 'expenses' ? `
      <h2>Ventes</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Commandes</div><div class="kpi-value">${filteredOrders.length}</div></div>
        <div class="kpi"><div class="kpi-label">CA Total</div><div class="kpi-value">${totalSales.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">CA Livré</div><div class="kpi-value green">${deliveredSales.toFixed(2)} DT</div></div>
      </div>
      <table>
        <thead><tr><th>Statut</th><th>Nombre</th><th>%</th></tr></thead>
        <tbody>${Object.entries(statusCounts).map(([s, c]) =>
          `<tr><td>${s}</td><td>${c}</td><td>${((c / filteredOrders.length) * 100).toFixed(1)}%</td></tr>`
        ).join('')}</tbody>
      </table>` : ''}

      ${reportType !== 'sales' ? `
      <h2>Dépenses</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Total dépenses</div><div class="kpi-value red">${totalExpenses.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Payées</div><div class="kpi-value">${paidExpenses.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Nombre</div><div class="kpi-value">${filteredExpenses.length}</div></div>
      </div>
      <table>
        <thead><tr><th>Catégorie</th><th>Montant</th><th>%</th></tr></thead>
        <tbody>${Object.entries(expenseByCat).map(([cat, amt]) =>
          `<tr><td>${sanitize(cat)}</td><td>${amt.toFixed(2)} DT</td><td>${((amt / totalExpenses) * 100).toFixed(1)}%</td></tr>`
        ).join('')}</tbody>
      </table>` : ''}

      ${reportType === 'combined' ? `
      <h2>Marge nette</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">CA Livré</div><div class="kpi-value green">${deliveredSales.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Dépenses payées</div><div class="kpi-value red">${paidExpenses.toFixed(2)} DT</div></div>
        <div class="kpi"><div class="kpi-label">Marge nette</div><div class="kpi-value ${profit >= 0 ? 'green' : 'red'}">${profit.toFixed(2)} DT</div></div>
      </div>` : ''}

      <div class="footer">${sanitize(config.siteName)} — Rapport généré le ${now}</div>
    </body></html>`;
  };

  const handlePrint = () => {
    const html = generateHTML();
    const w = window.open('', '_blank', 'width=950,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Générateur de rapports</h1>
          <p className="mt-1 text-sm text-gray-500">Rapports personnalisés pour ventes, dépenses et marges</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Type de rapport</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="combined">Combiné (Ventes + Dépenses)</option>
              <option value="sales">Ventes uniquement</option>
              <option value="expenses">Dépenses uniquement</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Période</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="quarter">3 derniers mois</option>
              <option value="year">12 derniers mois</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handlePrint} className="w-full">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Générer et imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Live Preview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Commandes</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{filteredOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">{periodLabel[period]}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">CA Livré</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">{deliveredSales.toFixed(2)} DT</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-wide text-red-700">Dépenses payées</p>
          <p className="mt-2 text-xl font-semibold text-red-800">{paidExpenses.toFixed(2)} DT</p>
        </div>
        <div className={`rounded-2xl border p-4 ${profit >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Marge nette</p>
          <p className={`mt-2 text-xl font-semibold ${profit >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{profit.toFixed(2)} DT</p>
        </div>
      </div>

      {/* Recent Orders Table Preview */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Aperçu des commandes ({filteredOrders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">N°</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.slice(0, 10).map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.status}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{order.totalAmount.toFixed(2)} DT</td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">Aucune commande sur cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
