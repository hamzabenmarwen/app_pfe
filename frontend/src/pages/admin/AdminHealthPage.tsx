import { useQuery } from '@tanstack/react-query';
import {
  ServerStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button, LoadingSpinner } from '@/components/ui';
import { motion } from 'framer-motion';
import api from '@/lib/api';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: ServiceHealth[];
}

export default function AdminHealthPage() {
  const {
    data: health,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<HealthResponse>({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const res = await api.get('/health/services');
      return res.data;
    },
    refetchInterval: 15_000, // auto-refresh every 15s
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const healthyCount = health?.services.filter((s) => s.status === 'healthy').length ?? 0;
  const totalCount = health?.services.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">État des services</h1>
          <p className="text-gray-400 mt-1">
            Surveillance en temps réel de l'infrastructure
          </p>
        </motion.div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Overall status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-full ${
              health?.status === 'healthy' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}
          >
            {health?.status === 'healthy' ? (
              <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
            ) : (
              <XCircleIcon className="h-8 w-8 text-red-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-medium text-gray-900">
              {health?.status === 'healthy'
                ? 'Tous les services fonctionnent'
                : 'Certains services sont indisponibles'}
            </h2>
            <p className="text-gray-400">
              {healthyCount}/{totalCount} services en ligne &middot; Dernière vérification :{' '}
              {health?.timestamp
                ? new Date(health.timestamp).toLocaleTimeString('fr-FR')
                : '-'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {health?.services.map((svc, i) => (
          <motion.div key={svc.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }} className="glass-card p-5 flex items-start gap-4">
            <div
              className={`mt-1 flex-shrink-0 p-2 rounded-lg ${
                svc.status === 'healthy' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              <ServerStackIcon
                className={`h-5 w-5 ${
                  svc.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">{svc.name}</h3>
                <span
                  className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                    svc.status === 'healthy'
                      ? 'bg-emerald-500/10 text-green-700'
                      : 'bg-red-500/10 text-red-700'
                  }`}
                >
                  {svc.status === 'healthy' ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
              <p className="text-sm text-gray-400 truncate mt-1">{svc.url}</p>
              {svc.responseTime != null && (
                <p className="text-xs text-gray-400 mt-1">
                  Temps de réponse : {svc.responseTime} ms
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
