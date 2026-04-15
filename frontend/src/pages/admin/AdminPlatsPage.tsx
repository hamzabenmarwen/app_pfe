import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { catalogService, type Plat, type Category } from '@/services/catalog.service';
import { Button, LoadingSpinner, Modal, Input, Badge } from '@/components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface PlatFormData {
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  minServings?: number;
  maxServings?: number;
}

export default function AdminPlatsPage() {
  const queryClient = useQueryClient();
  const [plats, setPlats] = useState<Plat[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlat, setEditingPlat] = useState<Plat | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlatFormData>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [platsRes, categoriesRes] = await Promise.all([
        catalogService.getPlats(),
        catalogService.getCategories(),
      ]);
      setPlats(platsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlat(null);
    reset({
      name: '',
      description: '',
      price: '' as unknown as number,
      image: '',
      categoryId: categories[0]?.id || '',
      isAvailable: true,
      isVegetarian: false,
      isVegan: false,
      isHalal: false,
      isGlutenFree: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plat: Plat) => {
    setEditingPlat(plat);
    reset({
      name: plat.name,
      description: plat.description || '',
      price: plat.price,
      image: plat.image || '',
      categoryId: plat.categoryId,
      isAvailable: plat.isAvailable,
      isVegetarian: plat.isVegetarian,
      isVegan: plat.isVegan,
      isHalal: plat.isHalal,
      isGlutenFree: plat.isGlutenFree,
      minServings: plat.minServings,
      maxServings: plat.maxServings,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: PlatFormData) => {
    setIsSubmitting(true);
    try {
      if (editingPlat) {
        await catalogService.updatePlat(editingPlat.id, data);
        toast.success('Plat mis à jour');
      } else {
        await catalogService.createPlat(data);
        toast.success('Plat créé');
      }

      // Ensure public menu/home lists refresh immediately after admin changes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plats'] }),
        queryClient.invalidateQueries({ queryKey: ['plats-du-jour'] }),
      ]);

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const response = await catalogService.uploadImage(file);
      if (response.success && response.url) {
        setValue('image', response.url);
        toast.success('Image téléchargée avec succès');
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;
    
    try {
      await catalogService.deletePlat(id);
      toast.success('Plat supprimé');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plats'] }),
        queryClient.invalidateQueries({ queryKey: ['plats-du-jour'] }),
      ]);

      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const toggleAvailability = async (plat: Plat) => {
    try {
      await catalogService.updatePlat(plat.id, { isAvailable: !plat.isAvailable });
      toast.success(plat.isAvailable ? 'Plat désactivé' : 'Plat activé');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plats'] }),
        queryClient.invalidateQueries({ queryKey: ['plats-du-jour'] }),
      ]);

      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
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
          <h1 className="text-2xl font-medium text-gray-900/90">Plats</h1>
          <p className="text-gray-400 mt-1">Gérez votre catalogue de plats</p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          Nouveau plat
        </Button>
      </div>

      {plats.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-400 mb-4">Aucun plat</p>
          <Button onClick={openCreateModal}>Créer un plat</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Plat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Options
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plats.map((plat) => (
                  <tr key={plat.id} className="hover:bg-transparent">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {plat.image ? (
                            <img
                              src={plat.image}
                              alt={plat.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span>🍽️</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{plat.name}</p>
                          {plat.description && (
                            <p className="text-sm text-gray-400 truncate max-w-xs">
                              {plat.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {plat.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {plat.price.toFixed(2)} DT
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {plat.isVegetarian && <Badge variant="success" size="sm">Végé</Badge>}
                        {plat.isVegan && <Badge variant="success" size="sm">Vegan</Badge>}
                        {plat.isHalal && <Badge variant="info" size="sm">Halal</Badge>}
                        {plat.isGlutenFree && <Badge variant="warning" size="sm">SG</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={plat.isAvailable ? 'success' : 'error'}>
                        {plat.isAvailable ? 'Disponible' : 'Indisponible'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleAvailability(plat)}
                          className="p-2 text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                          title={plat.isAvailable ? 'Désactiver' : 'Activer'}
                        >
                          {plat.isAvailable ? (
                            <EyeIcon className="h-5 w-5" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(plat)}
                          className="p-2 text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(plat.id)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlat ? 'Modifier le plat' : 'Nouveau plat'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom"
              error={errors.name?.message}
              {...register('name', { required: 'Nom requis' })}
            />
            <Input
              label="Prix (DT)"
              type="number"
              step="0.01"
              error={errors.price?.message}
              {...register('price', { 
                required: 'Prix requis',
                valueAsNumber: true,
                min: { value: 0, message: 'Prix positif requis' },
              })}
            />
          </div>

          <Input
            label="Description"
            {...register('description')}
          />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image du plat</label>
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6">
                <div className="text-center">
                  {watch('image') ? (
                    <div className="relative group">
                      <img src={watch('image')} alt="Aperçu" className="mx-auto h-32 w-auto rounded-lg" />
                      <button 
                        type="button" 
                        onClick={() => setValue('image', '')} 
                        className="absolute inset-0 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        Changer d'image
                      </button>
                    </div>
                  ) : (
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                  )}
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500"
                    >
                      <span>{isUploadingImage ? 'Téléchargement...' : 'Télécharger un fichier'}</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>
                  <p className="text-xs leading-5 text-gray-600">PNG, JPG, WEBP jusqu'à 5MB</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500/20"
                {...register('categoryId', { required: 'Catégorie requise' })}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Portions min."
              type="number"
              {...register('minServings', { valueAsNumber: true })}
            />
            <Input
              label="Portions max."
              type="number"
              {...register('maxServings', { valueAsNumber: true })}
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Options alimentaires</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isAvailable')}
                  className="rounded border-gray-200 text-primary-400"
                />
                <span className="text-sm">Disponible</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isVegetarian')}
                  className="rounded border-gray-200 text-primary-400"
                />
                <span className="text-sm">Végétarien</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isVegan')}
                  className="rounded border-gray-200 text-primary-400"
                />
                <span className="text-sm">Vegan</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isHalal')}
                  className="rounded border-gray-200 text-primary-400"
                />
                <span className="text-sm">Halal</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isGlutenFree')}
                  className="rounded border-gray-200 text-primary-400"
                />
                <span className="text-sm">Sans gluten</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingPlat ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

