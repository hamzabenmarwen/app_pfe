import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BellIcon, ChartBarIcon, ArrowPathIcon, CubeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { catalogService, type Ingredient, type IngredientCategory } from '@/services/catalog.service';
import { Button, LoadingSpinner, Badge, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminStockPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifying, setIsNotifying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editThreshold, setEditThreshold] = useState<number | ''>('');

  useEffect(() => {
    loadStock();
    loadCategories();
  }, []);

  const loadStock = async () => {
    try {
      const response = await catalogService.getAllIngredientsStock();
      setIngredients(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des stocks');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await catalogService.getIngredientCategories();
      setCategories(response.data || []);
    } catch (error) {
      // Silently fail - categories are not critical
    }
  };

  const handleUpdateStock = async (id: string) => {
    try {
      await catalogService.updateIngredientStock(id, Number(editQuantity) || 0, Number(editThreshold) || 0);
      toast.success('Stock mis à jour');
      setEditingId(null);
      loadStock();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du stock');
    }
  };

  const startEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setEditQuantity(ingredient.quantity);
    setEditThreshold(ingredient.lowStockThreshold);
  };

  const handleNotify = async () => {
    setIsNotifying(true);
    try {
      const response = await catalogService.notifyLowStockIngredients();
      toast.success(response.message || 'Notification envoyée');
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la notification");
    } finally {
      setIsNotifying(false);
    }
  };

  const filteredIngredients = selectedCategory === 'all'
    ? ingredients
    : ingredients.filter(i => i.categoryId === selectedCategory);

  const lowStockCount = ingredients.filter(i => i.isLowStock).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">Gestion des Stocks</h1>
          <p className="text-gray-400 mt-1">Suivez et mettez à jour vos matières premières</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleNotify}
            isLoading={isNotifying}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <BellIcon className="h-5 w-5 mr-1" />
            Alerter Admin
          </Button>
          <Button onClick={loadStock} variant="outline">
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Ingrédients</p>
            <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
          </div>
          <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
            <CubeIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Alertes Stock Faible</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Catégories</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ChartBarIcon className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filtrer par catégorie:</span>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-transparent/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ingrédient
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Unité
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Lieu de stockage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Seuil
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIngredients.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        <CubeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ingredient.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ingredient.unit || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ingredient.supplier || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ingredient.storageLocation || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ingredient.isLowStock ? (
                      <Badge variant="error">Stock Faible</Badge>
                    ) : ingredient.quantity > 0 ? (
                      <Badge variant="success">En stock</Badge>
                    ) : (
                      <Badge variant="warning">Rupture</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {editingId === ingredient.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-24 text-center mx-auto"
                      />
                    ) : (
                      <span className={`text-sm font-bold ${ingredient.isLowStock ? 'text-red-500' : 'text-gray-900'}`}>
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {editingId === ingredient.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editThreshold}
                        onChange={(e) => setEditThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-24 text-center mx-auto"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">
                        {ingredient.lowStockThreshold} {ingredient.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === ingredient.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => handleUpdateStock(ingredient.id)}>
                          Sauver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(ingredient)}>
                        Modifier
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredIngredients.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucun ingrédient trouvé
          </div>
        )}
      </motion.div>
    </div>
  );
}
