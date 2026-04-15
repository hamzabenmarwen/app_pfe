import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import recommendationService, { type PlatRecommendation } from '@/services/recommendation.service';

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<PlatRecommendation[]>([]);
  const [strategy, setStrategy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const params: { userId?: string; limit: number } = { limit: 4 };
        if (isAuthenticated && user?.id) {
          params.userId = user.id;
        }
        const data = await recommendationService.getRecommendations(params);
        setRecommendations(data.recommendations);
        setStrategy(data.strategy);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isAuthenticated, user?.id]);

  if (error || (!loading && recommendations.length === 0)) {
    return null; // Silently hide if AI service is unavailable
  }

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-xs uppercase tracking-[0.22em] mb-3">
            <SparklesIcon className="w-4 h-4" />
            Recommandations IA
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            {isAuthenticated ? 'Sélectionné pour vous' : 'Nos suggestions'}
          </h2>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
            {strategy === 'hybrid'
              ? 'Basé sur vos préférences et votre historique de commandes.'
              : 'Découvrez nos plats les plus appréciés par nos clients.'}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="h-48 shimmer" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 shimmer rounded" />
                  <div className="h-3 w-full shimmer rounded" />
                  <div className="h-3 w-1/2 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((plat, index) => (
              <motion.div
                key={plat.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
              >
                <Link
                  to="/menu"
                  className="group block rounded-2xl overflow-hidden border border-gray-200 bg-white card-hover"
                >
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    {plat.image ? (
                      <img
                        src={plat.image}
                        alt={plat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary-50 to-primary-100">
                        🍽️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-primary-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border border-gray-200">
                      <SparklesIcon className="w-3 h-3" />
                      IA
                    </div>
                    {plat.category && (
                      <div className="absolute top-3 right-3 bg-primary-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        {plat.category}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
                      {plat.name}
                    </h3>
                    {plat.description && (
                      <p className="text-gray-500 text-sm line-clamp-2 mb-2">{plat.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600 font-bold">{plat.price.toFixed(2)} DT</span>
                      <span className="text-xs text-gray-400 italic line-clamp-1 max-w-[50%] text-right">
                        {plat.reason}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-semibold transition-colors"
          >
            Voir tout le menu
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
