import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { eventService } from '@/services/event.service';
import { LoadingSpinner } from '@/components/ui';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'order' | 'event';
  status: string;
  date: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-indigo-400',
  READY: 'bg-cyan-400',
  DELIVERING: 'bg-orange-400',
  DELIVERED: 'bg-emerald-400',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-red-400',
  DRAFT: 'bg-gray-300',
  PENDING_QUOTE: 'bg-amber-400',
  QUOTE_SENT: 'bg-blue-400',
  QUOTE_ACCEPTED: 'bg-emerald-400',
  IN_PROGRESS: 'bg-indigo-400',
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: calendarEvents = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['admin-calendar', year, month],
    queryFn: async () => {
      const [ordersRes, eventsRes] = await Promise.all([
        api.get('/orders?limit=200').catch(() => ({ data: [] })),
        eventService.getAllEvents(1, 200).catch(() => ({ data: [], events: [] })),
      ]);

      // Orders can be in .data, .data.data, or .data.orders
      const rawOrders = ordersRes?.data;
      const ordersArray = Array.isArray(rawOrders)
        ? rawOrders
        : Array.isArray(rawOrders?.data)
          ? rawOrders.data
          : Array.isArray(rawOrders?.orders)
            ? rawOrders.orders
            : [];

      const orders = ordersArray.map((o: any) => ({
        id: o.id,
        title: `Cmd #${(o.id || '').slice(-6)}`,
        type: 'order' as const,
        status: o.status,
        date: o.deliveryDate || o.createdAt,
      }));

      // Events can be in .data, .data.events, or .events
      const rawEvents = eventsRes;
      const eventsArray = Array.isArray(rawEvents)
        ? rawEvents
        : Array.isArray(rawEvents?.data)
          ? rawEvents.data
          : Array.isArray(rawEvents?.events)
            ? rawEvents.events
            : Array.isArray(rawEvents?.data?.events)
              ? rawEvents.data.events
              : Array.isArray(rawEvents?.data?.data)
                ? rawEvents.data.data
                : [];

      const events = eventsArray.map((e: any) => ({
        id: e.id,
        title: e.name || `Événement #${(e.id || '').slice(-6)}`,
        type: 'event' as const,
        status: e.status,
        date: e.eventDate || e.date || e.createdAt,
      }));

      return [...orders, ...events];
    },
    staleTime: 60 * 1000,
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter((e) => {
      const eventDate = new Date(e.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-gray-900/90">Calendrier</h1>
        <p className="text-gray-400 mt-1">Vue mensuelle des commandes et événements</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="font-display text-xl font-medium text-gray-900">
            {MONTHS_FR[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_FR.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="min-h-[80px]" />;
            }

            const dayEvents = getEventsForDay(day);
            const todayClass = isToday(day)
              ? 'bg-primary-50 border-primary-300 ring-1 ring-primary-200'
              : 'bg-white border-gray-200 hover:border-gray-300';

            return (
              <div
                key={day}
                className={`min-h-[80px] border rounded-lg p-1.5 transition-colors ${todayClass}`}
              >
                <span className={`text-xs font-medium ${isToday(day) ? 'text-primary-600' : 'text-gray-500'}`}>
                  {day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1 group cursor-pointer"
                      title={`${event.title} (${event.status})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[event.status] || 'bg-gray-300'}`} />
                      <span className="text-[10px] text-gray-600 truncate group-hover:text-primary-600 transition-colors">
                        {event.type === 'order' ? '📦' : '🎉'} {event.title.slice(0, 12)}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{dayEvents.length - 3} autre(s)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> En attente</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Confirmé</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> En cours</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Terminé</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Annulé</span>
        </div>
      </motion.div>
    </div>
  );
}
