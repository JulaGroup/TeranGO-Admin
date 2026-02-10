import { create } from 'zustand'

export interface AppNotification {
  id: string
  title: string
  body: string
  data?: Record<string, unknown>
  read?: boolean
  createdAt: string
}

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (
    n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
  ) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (n) =>
    set((state) => {
      const notif: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: n.title,
        body: n.body,
        data: n.data,
        read: false,
        createdAt: new Date().toISOString(),
      }
      const notifications = [notif, ...state.notifications].slice(0, 200)
      try {
        localStorage.setItem(
          'admin_notifications',
          JSON.stringify(notifications)
        )
      } catch {
        /* empty */
      }
      return { notifications }
    }),
  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((t) =>
        t.id === id ? { ...t, read: true } : t
      )
      try {
        localStorage.setItem(
          'admin_notifications',
          JSON.stringify(notifications)
        )
      } catch {
        /* empty */
      }
      return { notifications }
    }),
  markAllRead: () =>
    set((state) => {
      const notifications = state.notifications.map((t) => ({
        ...t,
        read: true,
      }))
      try {
        localStorage.setItem(
          'admin_notifications',
          JSON.stringify(notifications)
        )
      } catch {
        /* empty */
      }
      return { notifications }
    }),
  clearAll: () => {
    try {
      localStorage.removeItem('admin_notifications')
    } catch {
      /* empty */
    }
    return set({ notifications: [] })
  },
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))

// Initialize from localStorage
try {
  const raw = localStorage.getItem('admin_notifications')
  if (raw) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      useNotificationStore.setState({ notifications: parsed })
    }
  }
} catch {
  /* empty */
}
