import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { catalogService, type Ingredient } from '@/services/catalog.service';

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'COUNT';

type StockMovement = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: MovementType;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  createdAt: string;
};

const MOVEMENTS_STORAGE_KEY = 'admin_stock_movements_v1';

function loadMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMovement(entry: StockMovement) {
  const current = loadMovements();
  const next = [entry, ...current].slice(0, 200);
  localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(next));
}

export default function AdminStockMovementsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ingredientId, setIngredientId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantityValue, setQuantityValue] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const [movements, setMovements] = useState<StockMovement[]>([]);

  const selectedIngredient = useMemo(
    () => ingredients.find((i) => i.id === ingredientId),
    [ingredients, ingredientId]
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await catalogService.getAllIngredientsStock();
      setIngredients(response.data || []);
      setMovements(loadMovements());
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const computeNewQuantity = (current: number, value: number, type: MovementType) => {
    if (type === 'IN') return current + value;
    if (type === 'OUT') return Math.max(0, current - value);
    return Math.max(0, current + value);
  };

  const handleRecordMovement = async () => {
    if (!selectedIngredient) {
      toast.error('Select an ingredient first');
      return;
    }

    const numericValue = Number(quantityValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const before = selectedIngredient.quantity;
      const signedValue = movementType === 'OUT' ? -numericValue : numericValue;
      const after = computeNewQuantity(before, numericValue, movementType);

      await catalogService.updateIngredientStock(
        selectedIngredient.id,
        after,
        selectedIngredient.lowStockThreshold
      );

      const entry: StockMovement = {
        id: `${Date.now()}-${selectedIngredient.id}`,
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        type: movementType,
        quantityBefore: before,
        quantityAfter: after,
        quantityChange: signedValue,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
      };

      saveMovement(entry);
      setMovements(loadMovements());
      await loadData();

      setQuantityValue('');
      setReason('');
      toast.success('Stock movement recorded');
    } catch {
      toast.error('Failed to record movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Mouvements de stock</h1>
          <p className="mt-1 text-sm text-gray-500">Suivez les entrées/sorties de stock et les ajustements</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Nouvel enregistrement</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Ingredient</label>
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Sélectionner un ingrédient</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="IN">Entrée</option>
              <option value="OUT">Sortie</option>
              <option value="ADJUSTMENT">Ajustement</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Quantité</label>
            <Input
              type="number"
              step="0.001"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Motif</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: réception fournisseur, casse, correction" />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleRecordMovement} isLoading={isSubmitting}>
            Enregistrer le mouvement
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Historique récent</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ingrédient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Avant</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Changement</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Après</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                movements.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(entry.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{entry.ingredientName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.type}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{entry.quantityBefore.toFixed(3)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${entry.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {entry.quantityChange >= 0 ? '+' : ''}
                      {entry.quantityChange.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{entry.quantityAfter.toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
