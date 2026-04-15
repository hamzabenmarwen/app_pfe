import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { catalogService, type Category } from '@/services/catalog.service';
import { Button, LoadingSpinner, Modal, Input } from '@/components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface CategoryFormData {
  name: string;
  description?: string;
  imageUrl?: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await catalogService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des categories');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    reset({ name: '', description: '', imageUrl: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      imageUrl: category.image || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = { ...data };
      if (!payload.imageUrl) {
        delete payload.imageUrl;
      }

      if (editingCategory) {
        await catalogService.updateCategory(editingCategory.id, payload);
        toast.success('Categorie mise a jour');
      } else {
        await catalogService.createCategory(payload);
        toast.success('Categorie creee');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'enregistrement");
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
        setValue('imageUrl', response.url);
        toast.success('Image telechargee avec succes');
      }
    } catch (error) {
      toast.error("Erreur lors du telechargement de l'image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer cette categorie ?')) return;
    
    try {
      await catalogService.deleteCategory(id);
      toast.success('Categorie supprimee');
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">Categories</h1>
          <p className="text-gray-400 mt-1">Gerez les categories de plats</p>
        </motion.div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          Nouvelle categorie
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center shadow-none border border-gray-200">
          <p className="text-gray-400 mb-4">Aucune categorie</p>
          <Button onClick={openCreateModal}>Creer une categorie</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="glass-card overflow-hidden hover:shadow-lg hover:shadow-black/10 transition-shadow"
            >
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">&#x1F4C1;</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(category)}
                    className="flex-1"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    className="text-red-400 border-red-300 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nom"
            error={errors.name?.message}
            {...register('name', { required: 'Nom requis' })}
          />
          <Input
            label="Description"
            {...register('description')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image de la categorie</label>
            <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6">
              <div className="text-center">
                {watch('imageUrl') ? (
                  <div className="relative group">
                    <img src={watch('imageUrl')} alt="Apercu" className="mx-auto h-32 w-auto rounded-lg" />
                    <button 
                      type="button" 
                      onClick={() => setValue('imageUrl', '')} 
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
                    <span>{isUploadingImage ? 'Telechargement...' : 'Telecharger un fichier'}</span>
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
                <p className="text-xs leading-5 text-gray-600">PNG, JPG, WEBP jusqu'a 5MB</p>
              </div>
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
              {editingCategory ? 'Mettre a jour' : 'Creer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}