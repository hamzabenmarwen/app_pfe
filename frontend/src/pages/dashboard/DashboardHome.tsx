import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBagIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { eventService, type Event } from '@/services/event.service';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, eventsRes] = await Promise.all([
        orderService.getMyOrders(),
        eventService.getMyEvents(),
      ]);
      setRecentOrders((ordersRes.data || []).slice(0, 3));
      setUpcomingEvents((eventsRes.data || []).slice(0, 3));
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      PREPARING: 'info',
      READY: 'success',
      DELIVERED: 'success',
      CANCELLED: 'error',
    };
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      PREPARING: 'En préparation',
      READY: 'Prête',
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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-medium text-gray-900">
          Bienvenue, {user?.firstName} !
        </h1>
        <p className="text-gray-400 mt-1 font-light">
          Gérez vos commandes, événements et adresses depuis votre espace personnel.
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ShoppingBagIcon, count: recentOrders.length, label: 'Commandes récentes', accent: 'text-primary-400', bg: 'bg-primary-500/10' },
          { icon: CalendarDaysIcon, count: upcomingEvents.length, label: 'Événements à venir', accent: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: DocumentTextIcon, count: 0, label: 'Factures', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -4 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 ${stat.bg} rounded-xl`}>
                <stat.icon className={`h-5 w-5 ${stat.accent}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-medium text-gray-900">{stat.count}</p>
                <p className="text-sm text-gray-400 font-light">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-display text-lg font-medium text-gray-800">Commandes récentes</h2>
          <Link to="/dashboard/orders" className="text-primary-400/70 hover:text-primary-600 text-xs font-light flex items-center gap-1 transition-colors">
            Voir tout <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="p-5">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBagIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-light">Aucune commande pour le moment</p>
              <Link to="/menu" className="text-primary-400/70 hover:text-primary-600 text-sm mt-2 inline-block font-light transition-colors">
                Découvrir le menu
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between px-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Commande #{order.id.slice(-6)}</p>
                    <p className="text-xs text-gray-400 font-light">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    <p className="font-display font-medium text-gray-800">{order.totalAmount.toFixed(2)} DT</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-display text-lg font-medium text-gray-800">Événements à venir</h2>
          <Link to="/dashboard/events" className="text-primary-400/70 hover:text-primary-600 text-xs font-light flex items-center gap-1 transition-colors">
            Voir tout <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="p-5">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDaysIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-light">Aucun événement planifié</p>
              <Link to="/events/create" className="text-primary-400/70 hover:text-primary-600 text-sm mt-2 inline-block font-light transition-colors">
                Organiser un événement
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="py-3 flex items-center justify-between px-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{event.name}</p>
                    <p className="text-xs text-gray-400 font-light">
                      {new Date(event.date).toLocaleDateString('fr-FR')} - {event.guestCount} invités
                    </p>
                  </div>
                  <Badge variant="info">{event.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
