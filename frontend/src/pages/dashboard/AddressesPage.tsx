import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { authService, type Address } from '@/services/auth.service';
import { LoadingSpinner, Button, Modal, Input } from '@/components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface AddressFormData {
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const response = await authService.getAddresses();
      setAddresses(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des adresses');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    reset({
      label: '',
      street: '',
      city: '',
      zipCode: '',
      country: 'Tunisie',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    reset({
      label: address.label,
      street: address.street,
      city: address.city,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: AddressFormData) => {
    try {
      if (editingAddress) {
        await authService.updateAddress(editingAddress.id, data);
        toast.success('Adresse mise à jour');
      } else {
        await authService.addAddress(data);
        toast.success('Adresse ajoutée');
      }
      setIsModalOpen(false);
      loadAddresses();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;
    
    try {
      await authService.deleteAddress(id);
      toast.success('Adresse supprimée');
      loadAddresses();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await authService.setDefaultAddress(id);
      toast.success('Adresse par défaut mise à jour');
      loadAddresses();
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-medium text-gray-900/90">Mes Adresses</h1>
        <Button onClick={openAddModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          Ajouter une adresse
        </Button>
      </motion.div>

      {addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center py-16"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MapPinIcon className="h-14 w-14 mx-auto text-gray-400" />
          </motion.div>
          <p className="text-gray-400 mb-4 mt-4">Vous n'avez pas encore d'adresses enregistrées</p>
          <Button onClick={openAddModal}>Ajouter une adresse</Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {addresses.map((address, i) => (
              <motion.div
                key={address.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3 }}
                className={`relative bg-white/80 backdrop-blur-xl rounded-2xl border shadow-none p-6 transition-shadow hover:shadow-none hover:shadow-primary-500/10 ${
                  address.isDefault ? 'border-primary-300 ring-2 ring-primary-500/20' : 'border-white/60'
                }`}
              >
                {address.isDefault && (
                  <span className="absolute top-3 right-3 bg-primary-500/10 text-primary-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                    Par défaut
                  </span>
                )}
                <h3 className="font-medium text-gray-900 mb-2">{address.label}</h3>
                <p className="text-gray-500 text-sm">{address.street}</p>
                <p className="text-gray-500 text-sm">{address.zipCode} {address.city}</p>
                <p className="text-gray-500 text-sm">{address.country}</p>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => openEditModal(address)}>
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => handleDelete(address.id)}>
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(address.id)}>
                      Définir par défaut
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Libellé"
            placeholder="Ex: Maison, Bureau..."
            {...register('label', { required: 'Le libellé est requis' })}
            error={errors.label?.message}
          />
          <Input
            label="Adresse"
            placeholder="123 Rue de la République"
            {...register('street', { required: 'L\'adresse est requise' })}
            error={errors.street?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code postal"
              placeholder="1000"
              {...register('zipCode', { required: 'Le code postal est requis' })}
              error={errors.zipCode?.message}
            />
            <Input
              label="Ville"
              placeholder="Sfax"
              {...register('city', { required: 'La ville est requise' })}
              error={errors.city?.message}
            />
          </div>
          <Input
            label="Pays"
            {...register('country')}
            error={errors.country?.message}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              {...register('isDefault')}
              className="h-4 w-4 text-primary-400 focus:ring-primary-500/20 border-gray-200 rounded-md"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Définir comme adresse par défaut
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingAddress ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
