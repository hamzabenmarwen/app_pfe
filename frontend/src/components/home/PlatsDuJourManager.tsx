import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FireIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { catalogService, type Plat } from '@/services/catalog.service';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'admin_plats_du_jour';

/** Read stored plat du jour IDs. */
function getStoredPlatsDuJour(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist plat du jour IDs. */
function setStoredPlatsDuJour(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function PlatsDuJourManager() {
  const [selectedIds, setSelectedIds] = useState<string[]>(getStoredPlatsDuJour());
  const [search, setSearch] = useState('');

  const { data: allPlats, isLoading } = useQuery<Plat[]>({
    queryKey: ['all-plats-for-pdj'],
    queryFn: async () => {
      const res = await catalogService.getPlats({ limit: 100 });
      return res?.data || res || [];
    },
  });

  // Persist to localStorage on change
  useEffect(() => {
    setStoredPlatsDuJour(selectedIds);
  }, [selectedIds]);

  const togglePlat = (id: string, name: string) => {
    const current = selectedIds;

    if (current.includes(id)) {
      setSelectedIds(current.filter((x) => x !== id));
      toast.success(`${name} retiré des plats du jour`);
      return;
    }

    if (current.length >= 6) {
      toast.error('Maximum 6 plats du jour autorisés');
      return;
    }

    setSelectedIds([...current, id]);
    toast.success(`${name} ajouté aux plats du jour`);
  };

  const clearAll = () => {
    setSelectedIds([]);
    toast.success('Sélection des plats du jour effacée');
  };

  const filteredPlats = (allPlats || []).filter(
    (p) =>
      p.isAvailable &&
      (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedPlats = (allPlats || []).filter((p) => selectedIds.includes(p.id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FireIcon className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-medium text-gray-900">Plats du jour</h2>
          <span className="text-xs text-gray-400 ml-2">
            {selectedIds.length}/6 sélectionnés
          </span>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Tout retirer
          </button>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Sélectionnez les plats qui seront mis en avant aujourd'hui sur la page d'accueil.
      </p>

      {/* Currently selected */}
      {selectedPlats.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
            Sélection actuelle
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedPlats.map((plat) => (
              <motion.div
                key={plat.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2 bg-primary-500/10 border border-primary-200 rounded-lg px-3 py-1.5"
              >
                {plat.image ? (
                  <img src={plat.image} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <span className="text-sm">🍽️</span>
                )}
                <span className="text-sm font-medium text-primary-700">{plat.name}</span>
                <button
                  onClick={() => togglePlat(plat.id, plat.name)}
                  className="ml-1 text-primary-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un plat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-transparent"
        />
      </div>

      {/* Plat list */}
      <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
        {filteredPlats.map((plat) => {
          const isSelected = selectedIds.includes(plat.id);
          return (
            <button
              key={plat.id}
              onClick={() => togglePlat(plat.id, plat.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-primary-50 border border-primary-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {plat.image ? (
                  <img src={plat.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-sm">🍽️</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{plat.name}</p>
                <p className="text-xs text-gray-400">{plat.category?.name} · {Number(plat.price).toFixed(2)} DT</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
              }`}>
                {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
