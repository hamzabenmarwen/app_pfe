import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationAudience = 'ADMIN' | 'CLIENT' | 'ALL';

export interface AppNotification {
  id: string;
  type: 'order' | 'event' | 'quote' | 'invoice' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
  audience?: NotificationAudience;
  userId?: string;
  dedupKey?: string;
}

type NotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
  createdAt?: string;
  read?: boolean;
};

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  clearAdminNotifications: (userId?: string) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) =>
        set((state) => {
          if (
            notification.dedupKey &&
            state.notifications.some((n) => n.dedupKey === notification.dedupKey)
          ) {
            return state;
          }

          const entry: AppNotification = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: notification.createdAt || new Date().toISOString(),
            read: notification.read ?? false,
            ...notification,
          };

          const notifications = [entry, ...state.notifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 100);
          return { notifications };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),

      clearAdminNotifications: (userId) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => {
            const audience = n.audience || 'ALL';
            const isAdminAudience = audience !== 'CLIENT';
            const isDashboardLink = n.href?.startsWith('/dashboard') || false;
            const isSameUser = userId ? !n.userId || n.userId === userId : true;

            if (!isAdminAudience || isDashboardLink || !isSameUser) {
              return true;
            }

            return false;
          }),
        })),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'assiette-gala-notifications',
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
);
