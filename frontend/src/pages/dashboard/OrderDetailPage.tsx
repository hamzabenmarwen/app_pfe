import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { printOrder } from '@/services/print.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { useSiteStore } from '@/stores/site.store';

export default function OrderDetailPage() {
  const { config } = useSiteStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await orderService.getOrderById(id!);
      setOrder(response.data);
    } catch (error) {
      toast.error('Commande introuvable');
      navigate('/dashboard/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;

    setIsCancelling(true);
    try {
      await orderService.cancelOrder(id!);
      toast.success('Commande annulée');
      loadOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Commande introuvable</p>
        <Link to="/dashboard/orders" className="text-primary-400/70 hover:text-primary-600 mt-2 inline-block">
          Retour aux commandes
        </Link>
      </div>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard/orders" className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-50/80">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-gray-900/90">
              Commande #{order.orderNumber || order.id.slice(-6)}
            </h1>
            <p className="text-gray-400 text-sm">
              Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(order.status)}
          <Button variant="outline" onClick={() => printOrder(order, null, config)} className="!rounded-xl">
            <PrinterIcon className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              onClick={handleCancel}
              isLoading={isCancelling}
              className="text-red-400 border-red-300 hover:bg-red-50 !rounded-xl"
            >
              Annuler
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Articles commandés</h2>
          </div>
          <div className="divide-y divide-gray-100/60">
            {order.items?.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + index * 0.04 }}
                className="px-6 py-4 flex items-center justify-between hover:bg-primary-500/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center text-lg">
                    🍽️
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.platName}</p>
                    <p className="text-sm text-gray-400">
                      {item.unitPrice.toFixed(2)} DT × {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-medium text-gray-900">
                  {(item.unitPrice * item.quantity).toFixed(2)} DT
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Récapitulatif</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Sous-total</span>
                <span>{order.subtotal.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Frais de livraison</span>
                <span>{order.deliveryFee.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>TVA</span>
                <span>{order.tax.toFixed(2)} DT</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-medium text-gray-900/90">
                <span>Total</span>
                <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  {order.totalAmount.toFixed(2)} DT
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Livraison</h2>
            </div>
            <div className="px-6 py-5 space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                📅 {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }) : 'Date non définie'}
              </p>
              {order.deliverySlot && (
                <p className="text-gray-500">🕐 {order.deliverySlot}</p>
              )}
              {order.deliveryAddress && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-gray-500">{order.deliveryAddress.street}</p>
                  <p className="text-gray-500">
                    {order.deliveryAddress.zipCode} {order.deliveryAddress.city}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {order.invoice?.payment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Paiement</h2>
              </div>
              <div className="px-6 py-5 space-y-2 text-sm text-gray-600">
                <p><span className="font-medium text-gray-900">Facture:</span> {order.invoice.invoiceNumber}</p>
                <p><span className="font-medium text-gray-900">Statut:</span> {order.invoice.payment.status}</p>
                {order.invoice.payment.method && (
                  <p><span className="font-medium text-gray-900">Méthode:</span> {order.invoice.payment.method === 'FLOUCI' ? 'Flouci' : order.invoice.payment.method === 'CARD' ? 'Carte bancaire' : 'Espèces'}</p>
                )}
                {order.invoice.payment.transactionRef && (
                  <p><span className="font-medium text-gray-900">Référence:</span> {order.invoice.payment.transactionRef}</p>
                )}
              </div>
            </motion.div>
          )}

          {order.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Notes</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-gray-500 text-sm">{order.notes}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
