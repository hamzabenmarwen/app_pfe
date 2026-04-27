import { useState, useEffect } from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { kitchenService, type KitchenDashboard, type IngredientDemandItem, type ProfitabilityItem } from '@/services/kitchen.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function StatusBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    HIGH: 'bg-red-50 text-red-700 border-red-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium ${styles[urgency] || styles.LOW}`}>
      {urgency === 'HIGH' ? 'Critique' : urgency === 'MEDIUM' ? 'Attention' : 'OK'}
    </span>
  );
}

function AnomalySeverity({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${
      severity === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
    }`}>
      {severity === 'HIGH' ? 'Anomalie majeure' : 'Anomalie moderee'}
    </span>
  );
}

export default function AdminKitchenPage() {
  const [dashboard, setDashboard] = useState<KitchenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ingredients' | 'profitability' | 'anomalies'>('overview');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kitchenService.getDashboard();
      setDashboard(data);
    } catch (e) {
      setError('Erreur lors du chargement des donnees kitchen intelligence');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500" />
        <span className="ml-3 text-gray-500 text-sm">Analyse en cours...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
          Reessayer
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kitchen Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">Briefing operationnel du {today}</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
          Rafraichir
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Commandes aujourd'hui"
          value={dashboard.actual_orders_today}
          subtitle={`Prevu: ${dashboard.predicted_orders_today}`}
          icon={ClipboardDocumentCheckIcon}
          trend={dashboard.variance_percent}
          trendLabel={`${dashboard.variance_percent > 0 ? '+' : ''}${dashboard.variance_percent}%`}
        />
        <KpiCard
          title="Alertes ingredients"
          value={dashboard.ingredient_alerts.length}
          subtitle={`${dashboard.ingredient_alerts.filter(i => i.urgency === 'HIGH').length} critiques`}
          icon={ExclamationTriangleIcon}
          accent="amber"
        />
        <KpiCard
          title="Bon de commande suggere"
          value={dashboard.purchase_order_suggestions.length}
          subtitle="Groupe par fournisseur"
          icon={TruckIcon}
          accent="blue"
        />
        <KpiCard
          title="Anomalies detectees"
          value={dashboard.anomalies.length}
          subtitle="14 derniers jours"
          icon={ChartPieIcon}
          accent="red"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {([
          { key: 'overview', label: 'Vue d\'ensemble' },
          { key: 'ingredients', label: 'Ingredients' },
          { key: 'profitability', label: 'Rentabilite' },
          { key: 'anomalies', label: 'Anomalies' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
      {activeTab === 'ingredients' && <IngredientsTab alerts={dashboard.ingredient_alerts} pos={dashboard.purchase_order_suggestions} />}
      {activeTab === 'profitability' && <ProfitabilityTab insights={dashboard.profitability_insights} />}
      {activeTab === 'anomalies' && <AnomaliesTab anomalies={dashboard.anomalies} />}
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, accent, trend, trendLabel }: any) {
  const accentMap: Record<string, string> = {
    amber: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    default: 'text-primary-600 bg-primary-50',
  };
  const colorClass = accentMap[accent || 'default'];
  return (
    <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof trend === 'number' && (
        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium">
          {trend > 0 ? (
            <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
          ) : (
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
          )}
          <span className={trend > 0 ? 'text-emerald-700' : 'text-red-700'}>{trendLabel}</span>
          <span className="text-gray-400 font-normal">vs prevision</span>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ dashboard }: { dashboard: KitchenDashboard }) {
  const topDishesData = dashboard.top_dishes_last_7d.map((d, i) => ({ name: d.name, qty: d.quantity, fill: COLORS[i % COLORS.length] }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Dishes */}
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Top plats - 7 derniers jours</h3>
        <p className="text-xs text-gray-500 mb-6">Par volume de commandes</p>
        {topDishesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topDishesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="qty" radius={[0, 6, 6, 0]} barSize={28}>
                {topDishesData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-12">Pas de donnees suffisantes</p>
        )}
      </div>

      {/* Ingredient Alerts Preview */}
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Alertes ingredients</h3>
        <p className="text-xs text-gray-500 mb-6">Besoins previsionnels pour aujourd'hui</p>
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {dashboard.ingredient_alerts.filter(i => i.urgency === 'HIGH').slice(0, 5).map((item) => (
            <div key={item.ingredient_id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  Stock: {item.current_stock} {item.unit} · Besoin: {item.predicted_demand} {item.unit}
                </p>
              </div>
              <StatusBadge urgency={item.urgency} />
            </div>
          ))}
          {dashboard.ingredient_alerts.filter(i => i.urgency === 'HIGH').length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">Aucune alerte critique</p>
          )}
        </div>
      </div>

      {/* PO Suggestions Preview */}
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6 lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Suggestions d'achat</h3>
        <p className="text-xs text-gray-500 mb-6">Bon de commande par fournisseur</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.purchase_order_suggestions.map((po) => (
            <div key={po.supplier_id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">{po.supplier_name}</p>
                <span className={`text-xs font-medium rounded-lg px-2 py-0.5 ${po.priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {po.lead_time_days}j delai
                </span>
              </div>
              <p className="text-xs text-gray-500">{po.items.length} ingredient(s)</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{po.total_cost_estimate.toFixed(2)} DT</p>
              <p className="text-xs text-gray-400">Commander avant le {format(new Date(po.suggested_order_date), 'dd/MM')}</p>
            </div>
          ))}
          {dashboard.purchase_order_suggestions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8 col-span-full">Aucun besoin d'approvisionnement detecte</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IngredientsTab({ alerts, pos }: { alerts: IngredientDemandItem[]; pos: any[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Prevision de demande par ingredient</h3>
          <p className="text-xs text-gray-500 mt-0.5">Basé sur les recettes et l'historique des commandes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock actuel</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Demande prevue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantite a commander</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estimation cout</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Urgence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map((item) => (
                <tr key={item.ingredient_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{item.current_stock} {item.unit}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{item.predicted_demand} {item.unit}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{item.needed_quantity} {item.unit}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{item.cost_estimate ? `${item.cost_estimate.toFixed(2)} DT` : '-'}</td>
                  <td className="px-6 py-3 text-center"><StatusBadge urgency={item.urgency} /></td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucune donnee disponible</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Bon de commande suggere</h3>
          <p className="text-xs text-gray-500 mt-0.5">Groupe par fournisseur selon les delais</p>
        </div>
        <div className="p-6 space-y-4">
          {pos.map((po) => (
            <div key={po.supplier_id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{po.supplier_name}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Delai: {po.lead_time_days} jours</span>
                  <span className={`text-xs font-medium rounded-lg px-2 py-0.5 ${po.priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    {po.priority}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Ingredient</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Quantite</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Unite</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Estimation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {po.items.map((it: IngredientDemandItem) => (
                      <tr key={it.ingredient_id}>
                        <td className="px-3 py-2 text-gray-900">{it.name}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{it.needed_quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{it.unit}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{it.cost_estimate ? `${it.cost_estimate.toFixed(2)} DT` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Commander avant le {format(new Date(po.suggested_order_date), 'dd/MM/yyyy')}</p>
                <p className="text-sm font-bold text-gray-900">{po.total_cost_estimate.toFixed(2)} DT</p>
              </div>
            </div>
          ))}
          {pos.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucune suggestion d'achat pour le moment</p>}
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTab({ insights }: { insights: KitchenDashboard['profitability_insights'] }) {
  const topMarginData = insights.top_margin_dishes.map((d: ProfitabilityItem) => ({ name: d.name, margin: d.margin_percent }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Plats les plus rentables</h3>
          <p className="text-xs text-gray-500 mb-6">Marge superieure a 30%</p>
          {topMarginData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topMarginData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)} />
                <Bar dataKey="margin" fill="#10b981" radius={[0, 6, 6, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Aucun plat avec marge elevee</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Plats a faible marge + volume eleve</h3>
          <p className="text-xs text-gray-500 mb-6">Marge inferieure a 10% mais volume eleve</p>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {insights.low_margin_high_volume.map((d: ProfitabilityItem) => (
              <div key={d.plat_id} className="flex items-center justify-between rounded-xl bg-red-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.volume_30d} ventes · {d.revenue_30d.toFixed(2)} DT CA</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-700">{d.margin_percent.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">marge</p>
                </div>
              </div>
            ))}
            {insights.low_margin_high_volume.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">Aucun plat problematique detecte</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnomaliesTab({ anomalies }: { anomalies: KitchenDashboard['anomalies'] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Anomalies detectees</h3>
          <p className="text-xs text-gray-500 mt-0.5">Detection statistique (IQR) sur les 14 derniers jours</p>
        </div>
        <div className="divide-y divide-gray-100">
          {anomalies.map((a, i) => (
            <div key={i} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <AnomalySeverity severity={a.severity} />
                  <p className="text-sm font-medium text-gray-900">{a.date}</p>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>{a.order_count} commandes</span>
                  <span>{a.revenue.toFixed(2)} DT</span>
                  <span>Panier moy: {a.avg_order_value.toFixed(2)} DT</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {a.reasons.map((r, j) => (
                    <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <LightBulbIcon className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right text-xs text-gray-400">
                {a.expected_order_count && <p>Prevu: {a.expected_order_count.toFixed(0)} cmd</p>}
                {a.expected_revenue && <p>Prevu: {a.expected_revenue.toFixed(2)} DT</p>}
              </div>
            </div>
          ))}
          {anomalies.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Aucune anomalie detectee sur la periode analysee
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
