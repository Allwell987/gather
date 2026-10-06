import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpotlightType = 'notification' | 'update' | 'news';

export interface SpotlightItem {
  id: string;
  type: SpotlightType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

interface NotificationState {
  items: SpotlightItem[];
  addItem: (item: Omit<SpotlightItem, 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  syncRemoteItems: (remoteItems: SpotlightItem[]) => void;
  getUnreadCount: () => number;
  hasUnread: () => boolean;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: 'welcome-1',
          type: 'update',
          title: 'Welcome to Gather!',
          description: 'We hope you enjoy using the new community features.',
          timestamp: new Date().toISOString(),
          isRead: false,
        }
      ],
      addItem: (item) => {
        const newItem: SpotlightItem = { ...item, isRead: false };
        set((state) => ({
          items: [newItem, ...state.items].slice(0, 50),
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          items: state.items.map((item) => ({ ...item, isRead: true })),
        }));
      },
      clearAll: () => set({ items: [] }),
      syncRemoteItems: (remoteItems) => {
        set((state) => {
          const currentItems = state.items;
          const merged = [...remoteItems];

          // Add local-only items (like push notifications received that aren't in DB yet)
          currentItems.forEach(localItem => {
            const exists = merged.find(m => m.id === localItem.id);
            if (!exists) {
              merged.push(localItem);
            } else if (localItem.isRead) {
              // Preserve read status for existing items
              const index = merged.findIndex(m => m.id === localItem.id);
              merged[index].isRead = true;
            }
          });

          return {
            items: merged
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 50)
          };
        });
      },
      getUnreadCount: () => get().items.filter((item) => !item.isRead).length,
      hasUnread: () => get().items.some((item) => !item.isRead),
    }),
    {
      name: 'gather-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
