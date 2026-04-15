import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { catalogService, type Ingredient } from '@/services/catalog.service';

type CountValue = number | '';

type StockMovement = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'COUNT';
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  createdAt: string;
};

const MOVEMENTS_STORAGE_KEY = 'admin_stock_movements_v1';

function appendCountMovements(entries: StockMovement[]) {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(parsed) ? parsed : [];
    const next = [...entries, ...current].slice(0, 200);
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // No-op on local storage failure
  }
}

export default function AdminStockTakePage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [countMap, setCountMap] = useState<Record<string, CountValue>>({});
  const [note, setNote] = useState('Inventaire periodique');

  const loadStock = async () => {
    try {
      setIsLoading(true);
      const response = await catalogService.getAllIngredientsStock();
      setIngredients(response.data || []);
    } catch {
      toast.error('Failed to load ingredient stock');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStock();
  }, []);

  const rows = useMemo(
    () =>
      ingredients.map((ingredient) => {
        const countValue = countMap[ingredient.id];
        const counted = countValue === '' || countValue === undefined ? null : Number(countValue);
        const delta = counted === null ? null : counted - ingredient.quantity;

        return {
          ingredient,
          counted,
          delta,
        };
      }),
    [ingredients, countMap]
  );

  const changedRows = rows.filter((row) => row.counted !== null && Math.abs((row.delta || 0)) > 0.0001);

  const setCount = (id: string, value: string) => {
    setCountMap((prev) => ({
      ...prev,
      [id]: value === '' ? '' : Number(value),
    }));
  };

  const applyInventory = async () => {
    if (changedRows.length === 0) {
      toast.error('No stock differences to apply');
      return;
    }

    try {
      setIsApplying(true);

      const countEntries: StockMovement[] = [];

      for (const row of changedRows) {
        const targetQty = Number(row.counted);
        await catalogService.updateIngredientStock(
          row.ingredient.id,
          targetQty,
          row.ingredient.lowStockThreshold
        );

        countEntries.push({
          id: `${Date.now()}-${row.ingredient.id}`,
          ingredientId: row.ingredient.id,
          ingredientName: row.ingredient.name,
          type: 'COUNT',
          quantityBefore: row.ingredient.quantity,
          quantityAfter: targetQty,
          quantityChange: targetQty - row.ingredient.quantity,
          reason: note.trim() || 'Inventory count',
          createdAt: new Date().toISOString(),
        });
      }

      appendCountMovements(countEntries);
      toast.success(`${changedRows.length} lignes de stock mises à jour`);
      setCountMap({});
      await loadStock();
    } catch {
      toast.error('Failed to apply inventory count');
    } finally {
      setIsApplying(false);
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
          <h1 className="text-2xl font-medium text-gray-900">Inventaire physique</h1>
          <p className="mt-1 text-sm text-gray-500">Comptez le stock réel et appliquez les différences</p>
        </div>
        <Button variant="outline" onClick={() => void loadStock()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Ingrédients</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{ingredients.length}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Différences détectées</p>
            <p className="mt-1 text-xl font-semibold text-amber-700">{changedRows.length}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Delta absolu total</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {changedRows.reduce((sum, row) => sum + Math.abs(row.delta || 0), 0).toFixed(3)}
            </p>
          </div>
        </div>

        <div className="mt-4 max-w-lg">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Note de session</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: inventaire fin de semaine" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ingrédient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unité</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté système</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté comptée</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.ingredient.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.ingredient.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.ingredient.unit}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-800">{row.ingredient.quantity.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      step="0.001"
                      value={countMap[row.ingredient.id] ?? ''}
                      onChange={(e) => setCount(row.ingredient.id, e.target.value)}
                      className="ml-auto w-28 text-right"
                    />
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${
                    row.delta === null ? 'text-gray-400' : row.delta === 0 ? 'text-gray-600' : row.delta > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {row.delta === null ? '-' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(3)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={applyInventory} isLoading={isApplying}>
          Appliquer inventaire
        </Button>
      </div>
    </div>
  );
}
