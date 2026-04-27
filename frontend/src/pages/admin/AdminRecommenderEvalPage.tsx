import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  TrophyIcon,
  EyeIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';
import { catalogService, type Plat } from '@/services/catalog.service';

interface EvalMetrics {
  PrecisionAtK: number;
  MAPAtK: number;
  Coverage: number;
  Diversity: number;
  evaluated_users: number;
  k: number;
}

interface ExplainResponse {
  plat_id: string;
  plat_name: string;
  reasons: string[];
  type: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminRecommenderEvalPage() {
  const [metrics, setMetrics] = useState<EvalMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [kValue, setKValue] = useState(5);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [explainUserId, setExplainUserId] = useState('');
  const [explainPlatId, setExplainPlatId] = useState('');
  const [explainResult, setExplainResult] = useState<ExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [plats, setPlats] = useState<Plat[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [platsLoading, setPlatsLoading] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setUsers(list);
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));

    catalogService.getPlats({ limit: 200 })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setPlats(list);
      })
      .catch(() => setPlats([]))
      .finally(() => setPlatsLoading(false));
  }, []);

  const loadMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const { data } = await api.get(`/recommendations/evaluate?k=${kValue}`);
      if (data.error) {
        setMetricsError(data.error);
        setMetrics(null);
      } else {
        setMetrics(data);
      }
    } catch (e: any) {
      setMetricsError(e.response?.data?.message || 'Erreur lors de l\'evaluation');
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!explainUserId || !explainPlatId) return;
    setExplainLoading(true);
    setExplainError(null);
    try {
      const { data } = await api.get(`/recommendations/explain/${explainPlatId}?userId=${explainUserId}`);
      setExplainResult(data);
    } catch (e: any) {
      setExplainError(e.response?.data?.message || 'Erreur lors de l\'explication');
    } finally {
      setExplainLoading(false);
    }
  };

  const chartData = metrics ? [
    { name: 'Precision@K', value: metrics.PrecisionAtK * 100 },
    { name: 'MAP@K', value: metrics.MAPAtK * 100 },
    { name: 'Coverage', value: metrics.Coverage * 100 },
    { name: 'Diversity', value: metrics.Diversity * 100 },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <AcademicCapIcon className="h-6 w-6 text-primary-500" />
          Evaluation du Recommandeur
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Metriques offline (Precision@K, MAP, Coverage) et explications SHAP-style des recommandations
        </p>
      </div>

      {/* Offline Evaluation Section */}
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-gray-400" />
              Metriques Offline
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Evaluation sur l\'historique des commandes reelles</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">K =</label>
              <input
                type="number"
                min="1"
                max="20"
                value={kValue}
                onChange={(e) => setKValue(parseInt(e.target.value) || 5)}
                className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center focus:border-primary-500 focus:outline-none"
              />
            </div>
            <button
              onClick={loadMetrics}
              disabled={metricsLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {metricsLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ChartBarIcon className="h-4 w-4" />
              )}
              Evaluer
            </button>
          </div>
        </div>

        {metricsError && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Donnees insuffisantes</p>
                <p className="text-xs text-amber-700 mt-0.5">{metricsError}</p>
              </div>
            </div>
          </div>
        )}

        {metrics && !metricsError && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Precision@K"
                value={metrics.PrecisionAtK}
                max={1}
                color="emerald"
                description="% de recommandations pertinentes dans le top-K"
              />
              <MetricCard
                label="MAP@K"
                value={metrics.MAPAtK}
                max={1}
                color="blue"
                description="Mean Average Precision - qualite globale du ranking"
              />
              <MetricCard
                label="Coverage"
                value={metrics.Coverage}
                max={1}
                color="amber"
                description="% du catalogue recommande au moins une fois"
              />
              <MetricCard
                label="Diversity"
                value={metrics.Diversity}
                max={1}
                color="violet"
                description="Variety des recommandations (pairwise dissimilarity)"
              />
              <div className="col-span-2 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Utilisateurs evalues</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.evaluated_users}</p>
                <p className="text-xs text-gray-400">avec historique train/test</p>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-4">Visualisation des metriques (%)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!metrics && !metricsError && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <ChartBarIcon className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">Lancer l\'evaluation</p>
            <p className="text-xs text-gray-400 mt-1">
              Cliquez sur "Evaluer" pour calculer les metriques sur les donnees historiques
            </p>
          </div>
        )}
      </div>

      {/* Explainability Section */}
      <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <EyeIcon className="h-4 w-4 text-gray-400" />
            Explications SHAP-style
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprendre pourquoi un plat est recommande a un client</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Utilisateur</label>
            <SearchableSelect
              items={users.map(u => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, sublabel: u.email }))}
              value={explainUserId}
              onChange={setExplainUserId}
              placeholder={usersLoading ? 'Chargement...' : 'Rechercher un utilisateur...'}
              icon={UserIcon}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Plat</label>
            <SearchableSelect
              items={plats.map(p => ({ id: p.id, label: p.name, sublabel: `${p.price} DT` }))}
              value={explainPlatId}
              onChange={setExplainPlatId}
              placeholder={platsLoading ? 'Chargement...' : 'Rechercher un plat...'}
              icon={LightBulbIcon}
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button
              onClick={handleExplain}
              disabled={explainLoading || !explainUserId || !explainPlatId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {explainLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <LightBulbIcon className="h-4 w-4" />
              )}
              Expliquer
            </button>
          </div>
        </div>

        {explainError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {explainError}
          </div>
        )}

        {explainResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-primary-200 flex items-center justify-center flex-shrink-0">
                <TrophyIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Pourquoi <span className="text-primary-700">{explainResult.plat_name}</span> est recommande
                </p>
                <div className="mt-3 space-y-2">
                  {explainResult.reasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700">{reason}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white border border-primary-200 px-3 py-1 text-xs text-primary-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                  Type: {explainResult.type === 'personalized' ? 'Personalisee' : 'Popularite'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SearchableSelect({ items, value, onChange, placeholder, icon: Icon }: {
  items: Array<{ id: string; label: string; sublabel?: string }>;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return item.label.toLowerCase().includes(q) || (item.sublabel ?? '').toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
  });

  const selected = items.find(i => i.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-left flex items-center gap-2 hover:border-gray-300 focus:border-primary-500 focus:outline-none transition-colors"
      >
        <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg bg-white border border-gray-200 shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">Aucun resultat</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.id); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${value === item.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.sublabel && <span className="ml-2 text-gray-400">{item.sublabel}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, max, color, description }: {
  label: string;
  value: number;
  max: number;
  color: string;
  description: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, { bar: string; bg: string; text: string }> = {
    emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    blue: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    amber: { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    violet: { bar: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className={`rounded-xl border border-gray-200 p-4 ${c.bg}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${c.text}`}>{(value * 100).toFixed(1)}%</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500 leading-snug">{description}</p>
    </div>
  );
}
