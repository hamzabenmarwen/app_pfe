import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, EyeIcon, CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { eventService, type Event } from '@/services/event.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await eventService.getMyEvents();
      setEvents(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      PENDING: 'warning',
      PENDING_QUOTE: 'warning',
      QUOTE_SENT: 'info',
      QUOTE_ACCEPTED: 'success',
      CONFIRMED: 'success',
      IN_PROGRESS: 'info',
      COMPLETED: 'info',
      CANCELLED: 'error',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente',
      PENDING_QUOTE: 'En attente de devis',
      QUOTE_SENT: 'Devis envoyé',
      QUOTE_ACCEPTED: 'Devis accepté',
      CONFIRMED: 'Confirmé',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-medium text-gray-900/90">Mes Événements</h1>
        <Link to="/events/create">
          <Button>
            <PlusIcon className="h-5 w-5 mr-1" />
            Nouvel événement
          </Button>
        </Link>
      </motion.div>

      {events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center py-16"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CalendarDaysIcon className="h-14 w-14 mx-auto text-gray-400" />
          </motion.div>
          <p className="text-gray-400 mb-4 mt-4">Vous n'avez pas encore d'événements</p>
          <Link to="/events/create">
            <Button>Organiser un événement</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="glass-card hover:shadow-none hover:shadow-primary-500/10 transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-400">{event.type}</p>
                </div>
                {getStatusBadge(event.status)}
              </div>
              
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">📅</span>
                  {new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">⏰</span>
                  {event.startTime} - {event.endTime}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">👥</span>
                  {event.guestCount} invités
                </div>
                {event.location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">📍</span>
                    {event.location}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Link to={`/dashboard/events/${event.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full !rounded-xl">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                </Link>
                {(event.status === 'COMPLETED' || event.status === 'CANCELLED') && (
                  <Link
                    to={`/events/create?type=${event.type}&guests=${event.guestCount}&rebook=1`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full !rounded-xl">
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Re-book
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
