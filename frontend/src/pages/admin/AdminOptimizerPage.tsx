import { useState } from 'react';
import {
  SparklesIcon,
  UsersIcon,
  BanknotesIcon,
  ScaleIcon,
  HeartIcon,
  CheckIcon,
  BeakerIcon,
  ChartPieIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { optimizerService, type OptimizedMenuResponse, type OptimizedMenuRequest } from '@/services/optimizer.service';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TYPES = [
  { value: 'WEDDING', label: 'Mariage', icon: '💒' },
  { value: 'CORPORATE', label: 'Evenement corporate', icon: '🏢' },
  { value: 'BIRTHDAY', label: 'Anniversaire', icon: '🎂' },
  { value: 'COCKTAIL', label: 'Cocktail', icon: '🍸' },
  { value: 'CONFERENCE', label: 'Conference', icon: '🎤' },
  { value: 'PRIVATE', label: 'Prive', icon: '🏠' },
];

const SERVICE_TYPES = [
  { value: 'buffet', label: 'Buffet' },
  { value: 'plated', label: 'Service a l\'assiette' },
  { value: 'cocktail', label: 'Cocktail dinatoire' },
];

function DietarySlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-sm font-medium ${color}`}>{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-primary-600"
      />
    </div>
  );
}

export default function AdminOptimizerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizedMenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OptimizedMenuRequest>({
    event_type: 'WEDDING',
    guest_count: 50,
    budget_per_person: 40,
    service_type: 'buffet',
    vegetarian_ratio: 0.1,
    vegan_ratio: 0,
    halal_ratio: 0.8,
    gluten_free_ratio: 0.05,
    min_starters: 2,
    min_mains: 2,
    min_desserts: 1,
    max_items_per_course: 5,
  });

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await optimizerService.optimizeEventMenu(form);
      setResult(res);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erreur lors de l\'optimisation');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = (result?.starters.length || 0) + (result?.mains.length || 0) + (result?.desserts.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-primary-500" />
          Optimiseur de menu evenementiel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Utilise la programmation lineaire mixte (PuLP) pour trouver le menu optimal selon votre budget et contraintes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ScaleIcon className="h-4 w-4 text-gray-400" />
              Contraintes de l\'evenement
            </h2>

            {/* Event Type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase">Type d\'evenement</label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map((et) => (
                  <button
                    key={et.value}
                    onClick={() => setForm(f => ({ ...f, event_type: et.value }))}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                      form.event_type === et.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{et.icon}</span>
                    <span className="truncate">{et.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase">Type de service</label>
              <div className="flex gap-2">
                {SERVICE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setForm(f => ({ ...f, service_type: st.value }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all ${
                      form.service_type === st.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <UsersIcon className="h-3.5 w-3.5" />
                  Invites
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.guest_count}
                  onChange={(e) => setForm(f => ({ ...f, guest_count: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <BanknotesIcon className="h-3.5 w-3.5" />
                  Budget/pers (DT)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.budget_per_person}
                  onChange={(e) => setForm(f => ({ ...f, budget_per_person: parseFloat(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dietary Constraints */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                <HeartIcon className="h-3.5 w-3.5" />
                Contraintes alimentaires
              </h3>
              <DietarySlider
                label="Halal"
                value={form.halal_ratio || 0}
                onChange={(v) => setForm(f => ({ ...f, halal_ratio: v }))}
                color="text-emerald-600"
              />
              <DietarySlider
                label="Vegetarien"
                value={form.vegetarian_ratio || 0}
                onChange={(v) => setForm(f => ({ ...f, vegetarian_ratio: v }))}
                color="text-lime-600"
              />
              <DietarySlider
                label="Vegan"
                value={form.vegan_ratio || 0}
                onChange={(v) => setForm(f => ({ ...f, vegan_ratio: v }))}
                color="text-green-600"
              />
              <DietarySlider
                label="Sans gluten"
                value={form.gluten_free_ratio || 0}
                onChange={(v) => setForm(f => ({ ...f, gluten_free_ratio: v }))}
                color="text-amber-600"
              />
            </div>

            {/* Variety */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-medium text-gray-500 uppercase">Variety minimale</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Entrees</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.min_starters}
                    onChange={(e) => setForm(f => ({ ...f, min_starters: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Plats</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.min_mains}
                    onChange={(e) => setForm(f => ({ ...f, min_mains: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Desserts</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.min_desserts}
                    onChange={(e) => setForm(f => ({ ...f, min_desserts: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleOptimize}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Resolution MILP en cours...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Optimiser avec PuLP
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!result && !error && (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                <ScaleIcon className="h-8 w-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Configurez vos contraintes</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Le solveur MILP (Mixed-Integer Linear Programming) trouvera le menu optimal minimisant le cout tout en respectant vos contraintes budgetaires et dietetiques.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <h3 className="font-medium text-red-900">Erreur d\'optimisation</h3>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Status Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    result.optimization_status === 'Optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <CheckIcon className="h-3.5 w-3.5" />
                    Statut: {result.optimization_status}
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
                    <BeakerIcon className="h-3.5 w-3.5" />
                    Resolu en {result.solver_time_ms}ms
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
                    <ChartPieIcon className="h-3.5 w-3.5" />
                    {totalItems} plats selectionnes
                  </div>
                  {result.waste_score > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                      Score de chevauchement: {result.waste_score}%
                    </div>
                  )}
                </div>

                {/* Cost Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-5 text-white">
                    <p className="text-xs font-medium opacity-80">Prix par personne</p>
                    <p className="mt-1 text-3xl font-bold">{result.estimated_price_per_person.toFixed(2)} DT</p>
                    <p className="mt-1 text-xs opacity-80">vs budget: {result.budget_per_person} DT</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500">Cout total estime</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{result.total_cost.toFixed(2)} DT</p>
                    <p className="mt-1 text-xs text-gray-400">pour {result.guest_count} invites</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500">Economie budgetaire</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-600">
                      {((result.budget_per_person - result.estimated_price_per_person) / result.budget_per_person * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-gray-400">sous le budget max</p>
                  </div>
                </div>

                {/* Dietary Coverage */}
                <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Couverture dietetique du menu</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(result.dietary_coverage).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="relative h-16 w-16 mx-auto">
                          <svg className="h-16 w-16 transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path
                              className={value >= 0.5 ? 'text-emerald-500' : 'text-amber-500'}
                              strokeDasharray={`${(value * 100).toFixed(0)}, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Menu Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MenuSection title="Entrees" items={result.starters} color="bg-blue-50 border-blue-100" />
                  <MenuSection title="Plats principaux" items={result.mains} color="bg-emerald-50 border-emerald-100" />
                  <MenuSection title="Desserts" items={result.desserts} color="bg-rose-50 border-rose-100" />
                </div>

                {/* Nutritional Summary */}
                {Object.keys(result.nutritional_summary).length > 0 && (
                  <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BeakerIcon className="h-4 w-4 text-gray-400" />
                      Information nutritionnelle
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(result.nutritional_summary).map(([key, value]) => (
                        value !== null && (
                          <span key={key} className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                            <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium text-gray-900">{typeof value === 'number' ? value.toFixed(0) : value}</span>
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraint Violations */}
                {result.constraint_violations.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <LightBulbIcon className="h-4 w-4" />
                      Avertissements
                    </h3>
                    <ul className="space-y-1">
                      {result.constraint_violations.map((v, i) => (
                        <li key={i} className="text-sm text-amber-700">{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MenuSection({ title, items, color }: { title: string; items: OptimizedMenuResponse['starters']; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-white/80 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{item.description || item.category}</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{item.price.toFixed(2)} DT</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {item.isVegan && <span className="text-[10px] rounded-full bg-green-100 px-2 py-0.5 text-green-700">Vegan</span>}
              {item.isVegetarian && <span className="text-[10px] rounded-full bg-lime-100 px-2 py-0.5 text-lime-700">Vegetarien</span>}
              {item.isHalal && <span className="text-[10px] rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Halal</span>}
              {item.isGlutenFree && <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Sans gluten</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Aucun plat selectionne</p>
        )}
      </div>
    </div>
  );
}
