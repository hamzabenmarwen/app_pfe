import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, FunnelIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { catalogService, type Plat, type Category, type PlatsFilters } from '@/services/catalog.service';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button, LoadingSpinner, Badge } from '@/components/ui';
import AuthPromptModal from '@/components/auth/AuthPromptModal';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();

  const [filters, setFilters] = useState<PlatsFilters>({
    categoryId: searchParams.get('category') || undefined,
    search: searchParams.get('search') || undefined,
    isVegetarian: searchParams.get('vegetarian') === 'true' || undefined,
    isVegan: searchParams.get('vegan') === 'true' || undefined,
    isHalal: searchParams.get('halal') === 'true' || undefined,
    isGlutenFree: searchParams.get('glutenFree') === 'true' || undefined,
  });

  const { data: plats = [], isLoading: platsLoading } = useQuery({
    queryKey: ['plats', filters],
    queryFn: async () => {
      const res = await catalogService.getPlats(filters);
      return (res.data || []) as Plat[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await catalogService.getCategories();
      return (res.data || []) as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = platsLoading;

  const handleAddToCart = (plat: Plat) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    addItem({
      platId: plat.id,
      platName: plat.name,
      unitPrice: plat.price,
      image: plat.image,
    });
    toast.success(`${plat.name} ajouté au panier`);
  };

  const handleFilterChange = (key: keyof PlatsFilters, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="h-px w-10 bg-gray-200" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light">La carte</span>
            <div className="h-px w-10 bg-gray-200" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-medium mb-4"
          >
            Notre <span className="italic text-primary-600">Menu</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto font-light"
          >
            Découvrez notre sélection de plats préparés avec passion par nos chefs.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un plat..."
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-transparent bg-white transition-all duration-300 placeholder:text-gray-400 text-gray-900 text-sm"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 !rounded-xl"
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
            </Button>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-5 mb-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-light text-gray-400 mb-1.5 uppercase tracking-wide">Catégorie</label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary-500/20 bg-white text-gray-800 text-sm"
                        value={filters.categoryId || ''}
                        onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                      >
                        <option value="">Toutes</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {[
                      { key: 'isVegetarian', label: '🥬 Végétarien', value: filters.isVegetarian },
                      { key: 'isVegan', label: '🌱 Vegan', value: filters.isVegan },
                      { key: 'isHalal', label: '🥩 Halal', value: filters.isHalal },
                      { key: 'isGlutenFree', label: '🌾 Sans gluten', value: filters.isGlutenFree },
                    ].map((filter) => (
                      <label key={filter.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={filter.value || false}
                          onChange={(e) => handleFilterChange(filter.key as keyof PlatsFilters, e.target.checked)}
                          className="rounded-md border-gray-200 bg-gray-100 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-gray-500 font-light">{filter.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange('categoryId', undefined)}
              className={`px-4 py-2 rounded-full text-xs font-light tracking-wide transition-all duration-300 ${!filters.categoryId
                  ? 'bg-primary-50 text-primary-600 border border-primary-500/30'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-600'
                }`}
            >
              Tous
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange('categoryId', cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-light tracking-wide transition-all duration-300 ${filters.categoryId === cat.id
                    ? 'bg-primary-50 text-primary-600 border border-primary-500/30'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-600'
                  }`}
              >
                {cat.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Plats Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : plats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <span className="text-6xl block mb-4">🔍</span>
            <p className="text-gray-500 text-lg font-light">Aucun plat trouvé</p>
            <p className="text-gray-400 mt-2 text-sm font-light">Essayez de modifier vos filtres</p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {plats.map((plat, index) => (
                <motion.div
                  key={plat.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                >
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="glass-card overflow-hidden group"
                  >
                    <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                      {plat.image ? (
                        <img
                          src={plat.image}
                          alt={plat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary-50 to-primary-100">
                          🍽️
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {plat.isVegetarian && <Badge variant="success" size="sm">🥬 Végé</Badge>}
                        {plat.isVegan && <Badge variant="success" size="sm">🌱 Vegan</Badge>}
                        {plat.isHalal && <Badge variant="info" size="sm">Halal</Badge>}
                        {plat.isGlutenFree && <Badge variant="warning" size="sm">Sans gluten</Badge>}
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-[10px] text-primary-400/60 uppercase tracking-[0.2em] mb-1.5 font-light">
                        {plat.category?.name}
                      </p>
                      <h3 className="font-display text-base font-medium text-gray-900 mb-1.5">{plat.name}</h3>
                      {plat.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed font-light">
                          {plat.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-display font-medium text-primary-600">
                          {plat.price.toFixed(2)} DT
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(plat)}
                          disabled={!plat.isAvailable}
                          className="!rounded-full !text-xs"
                        >
                          {!plat.isAvailable ? 'Indisponible' : isAuthenticated ? 'Ajouter' : (
                            <span className="flex items-center gap-1">
                              <LockClosedIcon className="w-3 h-3" />
                              Ajouter
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Connectez-vous pour ajouter des plats à votre panier et profiter de nos services traiteur."
      />
    </div>
  );
}
