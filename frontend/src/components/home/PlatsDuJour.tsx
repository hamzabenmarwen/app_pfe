import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SparklesIcon, FireIcon, ShoppingCartIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { catalogService, type Plat } from '@/services/catalog.service';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui';
import AuthPromptModal from '@/components/auth/AuthPromptModal';
import toast from 'react-hot-toast';

/**
 * Plats du Jour — Daily specials section for the homepage.
 * Uses a deterministic seed (today's date) to pick 3-4 dishes from the catalog
 * so the selection changes every day but stays consistent for all visitors.
 */
export default function PlatsDuJour() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();

  const handleAddToCart = (plat: Plat) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    addItem({
      platId: plat.id,
      platName: plat.name,
      unitPrice: typeof plat.price === 'number' ? plat.price : Number(plat.price),
      image: plat.image,
    });
    toast.success(`${plat.name} ajouté au panier`);
  };

  const { data: plats, isLoading } = useQuery<Plat[]>({
    queryKey: ['plats-du-jour'],
    queryFn: async () => {
      const res = await catalogService.getPlats({ limit: 50 });
      const allPlats = res?.data || res || [];
      if (!Array.isArray(allPlats) || allPlats.length === 0) return [];

      // Check if admin has manually selected plats du jour
      try {
        const storedIds = localStorage.getItem('admin_plats_du_jour');
        if (storedIds) {
          const ids: string[] = JSON.parse(storedIds);
          if (Array.isArray(ids) && ids.length > 0) {
            const selected = allPlats.filter((p: Plat) => ids.includes(p.id) && p.isAvailable);
            if (selected.length > 0) return selected;
          }
        }
      } catch { /* ignore parse errors */ }

      // Fallback: Use today's date as a deterministic seed
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

      // Simple seeded shuffle
      const shuffled = [...allPlats].sort((a, b) => {
        const hashA = ((seed * 31 + a.id.charCodeAt(0)) % 1000) / 1000;
        const hashB = ((seed * 31 + b.id.charCodeAt(0)) % 1000) / 1000;
        return hashA - hashB;
      });

      return shuffled.slice(0, 4);
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!plats || plats.length === 0) return null;

  return (
    <section className="py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-primary-300" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-primary-400 font-light flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5" />
              Sélection du jour
            </span>
            <div className="h-px w-10 bg-primary-300" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-gray-900">
            Nos plats du <span className="italic text-primary-500">jour</span>
          </h2>
          <p className="text-gray-400 mt-2 font-light max-w-md mx-auto">
            Notre sélection du jour, fraîchement préparée par nos chefs.
          </p>
        </motion.div>

        {/* Plats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plats.map((plat, i) => (
            <motion.div
              key={plat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass-card overflow-hidden group"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100">
                {plat.image ? (
                  <img
                    src={plat.image}
                    alt={plat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                )}
                {/* Badge "Du Jour" */}
                <div className="absolute top-3 left-3 bg-primary-500 text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                  <FireIcon className="w-3 h-3" />
                  Du jour
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-display text-base font-medium text-gray-900 truncate">
                  {plat.name}
                </h3>
                {plat.description && (
                  <p className="text-gray-400 text-xs font-light mt-1 line-clamp-2">
                    {plat.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="font-display text-lg font-medium text-primary-500">
                    {Number(plat.price).toFixed(2)} DT
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(plat); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-500 text-white text-[10px] uppercase tracking-wider font-medium hover:bg-primary-600 transition-colors shadow-sm hover:shadow-md"
                  >
                    {isAuthenticated ? (
                      <>
                        <ShoppingCartIcon className="w-3 h-3" />
                        Ajouter
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="w-3 h-3" />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors font-light group"
          >
            Voir tout le menu
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </motion.div>
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Connectez-vous pour commander nos plats du jour et profiter de notre sélection quotidienne."
      />
    </section>
  );
}
