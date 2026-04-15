import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { catalogService, type Ingredient, type Supplier, type SupplierDetail } from '@/services/catalog.service';

type SupplierFormState = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number | '';
  paymentTerms: string;
  notes: string;
};

type StockMovement = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'COUNT';
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

const initialForm: SupplierFormState = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  leadTimeDays: '',
  paymentTerms: '',
  notes: '',
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormState>(initialForm);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SupplierDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [suppliersRes, ingredientsRes] = await Promise.all([
        catalogService.getSuppliers(undefined, true),
        catalogService.getAllIngredientsStock(),
      ]);
      setSuppliers(suppliersRes.data || []);
      setIngredients(ingredientsRes.data || []);
    } catch {
      toast.error('Failed to load suppliers data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const availableIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.isActive),
    [ingredients]
  );

  const supplierMovementHistory = useMemo(() => {
    if (!selectedDetail) return [];
    const ingredientIds = new Set(selectedDetail.ingredients.map((ingredient) => ingredient.id));
    return loadMovements().filter((entry) => ingredientIds.has(entry.ingredientId));
  }, [selectedDetail]);

  const supplierKpis = useMemo(() => {
    if (!selectedDetail) {
      return {
        totalStockValue: 0,
        avgCostPerUnit: 0,
        lowStockRate: 0,
      };
    }

    const activeIngredients = selectedDetail.ingredients.filter((ingredient) => ingredient.isActive);
    const costItems = activeIngredients.filter(
      (ingredient) => typeof ingredient.costPerUnit === 'number' && ingredient.costPerUnit > 0
    );

    const totalStockValue = activeIngredients.reduce(
      (sum, ingredient) => sum + ingredient.quantity * (ingredient.costPerUnit || 0),
      0
    );

    const avgCostPerUnit =
      costItems.length === 0
        ? 0
        : costItems.reduce((sum, ingredient) => sum + (ingredient.costPerUnit || 0), 0) / costItems.length;

    const lowStockRate =
      activeIngredients.length === 0
        ? 0
        : (activeIngredients.filter((ingredient) => ingredient.isLowStock).length / activeIngredients.length) * 100;

    return {
      totalStockValue,
      avgCostPerUnit,
      lowStockRate,
    };
  }, [selectedDetail]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await catalogService.updateSupplier(editingId, {
          name: form.name.trim(),
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          leadTimeDays: form.leadTimeDays === '' ? undefined : Number(form.leadTimeDays),
          paymentTerms: form.paymentTerms || undefined,
          notes: form.notes || undefined,
        });
        toast.success('Supplier updated');
      } else {
        await catalogService.createSupplier({
          name: form.name.trim(),
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          leadTimeDays: form.leadTimeDays === '' ? undefined : Number(form.leadTimeDays),
          paymentTerms: form.paymentTerms || undefined,
          notes: form.notes || undefined,
        });
        toast.success('Supplier created');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      leadTimeDays: supplier.leadTimeDays ?? '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
    });
  };

  const handleViewDetails = async (supplierId: string) => {
    try {
      setIsLoadingDetail(true);
      const response = await catalogService.getSupplierById(supplierId);
      setSelectedDetail(response.data || null);
    } catch {
      toast.error('Failed to load supplier details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await catalogService.deleteSupplier(id);
      toast.success('Supplier deleted');
      if (selectedDetail?.id === id) {
        setSelectedDetail(null);
      }
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete supplier');
    }
  };

  const handleLinkIngredient = async () => {
    if (!selectedSupplierId || !selectedIngredientId) {
      toast.error('Select both supplier and ingredient');
      return;
    }

    try {
      setIsLinking(true);
      await catalogService.updateIngredient(selectedIngredientId, { supplierId: selectedSupplierId });
      toast.success('Ingredient linked to supplier');
      setSelectedIngredientId('');
      await loadData();
      if (selectedDetail?.id === selectedSupplierId) {
        await handleViewDetails(selectedSupplierId);
      }
    } catch {
      toast.error('Failed to link ingredient');
    } finally {
      setIsLinking(false);
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
          <h1 className="text-2xl font-medium text-gray-900">Fournisseurs</h1>
          <p className="mt-1 text-sm text-gray-500">CRUD fournisseurs avec liaison aux ingredients</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">
          {editingId ? 'Modifier fournisseur' : 'Nouveau fournisseur'}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Global Food Tunisie"
          />
          <Input
            label="Contact"
            value={form.contactName}
            onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
            placeholder="Nom du contact"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="contact@supplier.tn"
          />
          <Input
            label="Telephone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+216"
          />
          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Adresse complete"
          />
          <Input
            label="Delai moyen (jours)"
            type="number"
            value={form.leadTimeDays}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                leadTimeDays: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            placeholder="Ex: 3"
          />
          <Input
            label="Conditions de paiement"
            value={form.paymentTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
            placeholder="Ex: 30 jours fin de mois"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Conditions, delais, remarques"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
          )}
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {editingId ? 'Mettre a jour' : 'Creer'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Lier un ingredient</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Fournisseur</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select supplier</option>
              {suppliers.filter((supplier) => supplier.isActive).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Ingredient</label>
            <select
              value={selectedIngredientId}
              onChange={(e) => setSelectedIngredientId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select ingredient</option>
              {availableIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={handleLinkIngredient} isLoading={isLinking} className="w-full">
              <LinkIcon className="h-4 w-4" />
              Lier
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ingredients</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Low stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    No suppliers yet
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.contactName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.email || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{supplier.ingredientsCount}</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-700">{supplier.lowStockIngredientsCount}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {supplier.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleViewDetails(supplier.id)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(supplier)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleDelete(supplier.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(selectedDetail || isLoadingDetail) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Detail fournisseur</h2>
            {selectedDetail && (
              <Button size="sm" variant="outline" onClick={() => setSelectedDetail(null)}>
                Close
              </Button>
            )}
          </div>

          {isLoadingDetail ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : selectedDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Ingredients actifs</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {selectedDetail.ingredients.filter((ingredient) => ingredient.isActive).length}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Valeur stock</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{supplierKpis.totalStockValue.toFixed(2)} DT</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Cout moyen / unite</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{supplierKpis.avgCostPerUnit.toFixed(2)} DT</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Taux low stock</p>
                  <p className="mt-1 text-xl font-semibold text-amber-700">{supplierKpis.lowStockRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Delai moyen</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {selectedDetail.leadTimeDays ? `${selectedDetail.leadTimeDays} jours` : 'Non renseigne'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Conditions paiement</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {selectedDetail.paymentTerms || 'Non renseigne'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Ingredients lies</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ingredient</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Cost/Unit</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedDetail.ingredients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                            No ingredient linked
                          </td>
                        </tr>
                      ) : (
                        selectedDetail.ingredients.map((ingredient) => (
                          <tr key={ingredient.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{ingredient.name}</td>
                            <td className="px-3 py-2 text-right text-sm text-gray-700">
                              {ingredient.quantity.toFixed(3)} {ingredient.unit}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-gray-700">
                              {typeof ingredient.costPerUnit === 'number' ? `${ingredient.costPerUnit.toFixed(2)} DT` : '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {ingredient.isLowStock ? (
                                <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">Low</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">OK</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Historique mouvements (local admin)</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ingredient</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Delta</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {supplierMovementHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                            No movement history for this supplier in current browser
                          </td>
                        </tr>
                      ) : (
                        supplierMovementHistory.slice(0, 20).map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 text-sm text-gray-700">{new Date(entry.createdAt).toLocaleString('fr-FR')}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{entry.ingredientName}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{entry.type}</td>
                            <td className={`px-3 py-2 text-right text-sm font-medium ${entry.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {entry.quantityChange >= 0 ? '+' : ''}{entry.quantityChange.toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">{entry.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
