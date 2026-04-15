import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { EyeIcon, ShoppingBagIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { openPrintPreviewWindow, printOrder } from '@/services/print.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { useSiteStore } from '@/stores/site.store';

export default function OrdersPage() {
  const { config } = useSiteStore();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const response = await orderService.getMyOrders();
      return (response.data || []) as Order[];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      PREPARING: 'info',
      READY: 'success',
      DELIVERING: 'info',
      DELIVERED: 'success',
      CANCELLED: 'error',
    };
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      PREPARING: 'En préparation',
      READY: 'Prête',
      DELIVERING: 'En livraison',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const handlePrintOrder = async (orderId: string) => {
    const previewWindow = openPrintPreviewWindow('Préparation de la commande...');
    if (!previewWindow) {
      toast.error('Veuillez autoriser les popups pour imprimer');
      return;
    }

    try {
      const response = await orderService.getOrderById(orderId);
      if (!response?.data) {
        previewWindow.close();
        toast.error('Impossible de charger la commande pour impression');
        return;
      }

      printOrder(response.data as Order, previewWindow, config);
    } catch {
      previewWindow.close();
      toast.error('Erreur lors de l\'impression de la commande');
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
        <h1 className="text-2xl font-medium text-gray-900/90">Mes Commandes</h1>
      </motion.div>

      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center py-16"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShoppingBagIcon className="h-14 w-14 mx-auto text-gray-400" />
          </motion.div>
          <p className="text-gray-400 mb-4 mt-4">Vous n'avez pas encore de commandes</p>
          <Link to="/menu">
            <Button>Découvrir le menu</Button>
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-4 lg:hidden">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">#{order.id.slice(-6)}</p>
                    <p className="text-xs text-gray-400">{order.items?.length || 0} articles</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span>
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-medium text-gray-900">{order.totalAmount.toFixed(2)} DT</span>
                </div>
                <Link to={`/dashboard/orders/${order.id}`}>
                  <Button variant="outline" size="sm" className="w-full !rounded-xl">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full !rounded-xl mt-2"
                  onClick={() => handlePrintOrder(order.id)}
                >
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  Imprimer
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block glass-card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-transparent/60">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Commande</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Livraison</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {orders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                      className="hover:bg-primary-500/10 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">#{order.id.slice(-6)}</p>
                        <p className="text-sm text-gray-400">{order.items?.length || 0} articles</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.totalAmount.toFixed(2)} DT</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/dashboard/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="!rounded-xl">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Détails
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => handlePrintOrder(order.id)}>
                            <PrinterIcon className="h-4 w-4 mr-1" />
                            Imprimer
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
