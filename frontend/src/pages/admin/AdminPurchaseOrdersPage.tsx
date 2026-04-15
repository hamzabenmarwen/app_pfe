import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  PlusCircleIcon,
  PaperAirplaneIcon,
  CheckBadgeIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Badge, Button, Input, LoadingSpinner } from '@/components/ui';
import {
  catalogService,
  type Ingredient,
  type Supplier,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/services/catalog.service';

type NewOrderLine = {
  ingredientId: string;
  quantity: number;
  unitCost: number;
};

const statusLabel: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoye',
  RECEIVED: 'Recu',
  CANCELLED: 'Annule',
};

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  SENT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

export default function AdminPurchaseOrdersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewOrderLine[]>([{ ingredientId: '', quantity: 1, unitCost: 0 }]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [suppliersRes, ingredientsRes] = await Promise.all([
        catalogService.getSuppliers(undefined, true),
        catalogService.getAllIngredientsStock(),
      ]);
      setSuppliers((suppliersRes.data || []) as Supplier[]);
      setIngredients((ingredientsRes.data || []) as Ingredient[]);
      const ordersRes = await catalogService.getPurchaseOrders();
      setOrders((ordersRes.data || []) as PurchaseOrder[]);
    } catch {
      toast.error('Erreur chargement des bons de commande');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, { ingredientId: '', quantity: 1, unitCost: 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, index) => index !== idx));
  };

  const updateLine = (idx: number, patch: Partial<NewOrderLine>) => {
    setLines((prev) => prev.map((line, index) => (index === idx ? { ...line, ...patch } : line)));
  };

  const validLines = useMemo(() => {
    return lines
      .map((line) => {
        const ingredient = ingredientMap.get(line.ingredientId);
        if (!ingredient || line.quantity <= 0 || line.unitCost <= 0) return null;

        return {
          ingredientId: ingredient.id,
          quantity: line.quantity,
          unitCost: line.unitCost,
        };
      })
      .filter(Boolean) as Array<{ ingredientId: string; quantity: number; unitCost: number }>;
  }, [lines, ingredientMap]);

  const subtotalPreview = useMemo(
    () => validLines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    [validLines]
  );

  const resetForm = () => {
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setLines([{ ingredientId: '', quantity: 1, unitCost: 0 }]);
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier) {
      toast.error('Selectionnez un fournisseur');
      return;
    }

    if (validLines.length === 0) {
      toast.error('Ajoutez au moins une ligne valide');
      return;
    }

    try {
      setIsSubmitting(true);
      await catalogService.createPurchaseOrder({
        supplierId: selectedSupplier.id,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        lines: validLines,
      });

      resetForm();
      toast.success('Bon de commande cree');
      await refreshAll();
    } catch {
      toast.error('Echec creation du bon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOrder = async (order: PurchaseOrder) => {
    if (order.status !== 'DRAFT') return;
    try {
      setIsSubmitting(true);
      await catalogService.updatePurchaseOrderStatus(order.id, 'SENT');
      toast.success('Bon de commande envoye');
      await refreshAll();
    } catch {
      toast.error('Echec de mise a jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    if (order.status === 'RECEIVED') return;
    try {
      setIsSubmitting(true);
      await catalogService.updatePurchaseOrderStatus(order.id, 'CANCELLED');
      toast.success('Bon annule');
      await refreshAll();
    } catch {
      toast.error('Echec de mise a jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveOrder = async (order: PurchaseOrder) => {
    if (order.status !== 'SENT') return;

    try {
      setIsSubmitting(true);
      await catalogService.updatePurchaseOrderStatus(order.id, 'RECEIVED');

      toast.success('Reception en stock appliquee');
      await refreshAll();
    } catch {
      toast.error('Echec de reception du bon');
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
          <h1 className="text-2xl font-medium text-gray-900">Bons de commande</h1>
          <p className="mt-1 text-sm text-gray-500">Creation, envoi et reception fournisseur avec impact stock.</p>
        </div>
        <Button variant="outline" onClick={() => void refreshAll()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Nouveau bon fournisseur</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Fournisseur</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Selectionner</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <Input
            type="date"
            label="Date attendue"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
          <Input
            label="Note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: livraison matinale"
          />
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={`line-${idx}`} className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Ingredient</label>
                <select
                  value={line.ingredientId}
                  onChange={(e) => updateLine(idx, { ingredientId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Selectionner</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <Input
                  type="number"
                  step="0.001"
                  label="Quantite"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="lg:col-span-2">
                <Input
                  type="number"
                  step="0.001"
                  label="Prix unitaire"
                  value={line.unitCost}
                  onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="lg:col-span-2 flex items-end gap-2">
                <Button type="button" variant="outline" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
                {idx === lines.length - 1 && (
                  <Button type="button" variant="outline" onClick={addLine}>
                    <PlusCircleIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Sous-total: <span className="font-semibold text-gray-900">{subtotalPreview.toFixed(2)} DT</span></p>
          <Button onClick={() => void handleCreateOrder()} isLoading={isSubmitting}>Creer le bon</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Aucun bon de commande</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-900">{order.poNumber}</p>
                      <p className="text-gray-500">{order.lines.length} lignes</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.supplier?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{order.subtotal.toFixed(2)} DT</td>
                    <td className="px-4 py-3"> 
                      <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {order.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => handleSendOrder(order)}>
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {order.status === 'SENT' && (
                          <Button
                            size="sm"
                            onClick={() => void handleReceiveOrder(order)}
                            isLoading={isSubmitting}
                          >
                            <CheckBadgeIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                          <Button size="sm" variant="outline" onClick={() => handleCancelOrder(order)}>
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
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
