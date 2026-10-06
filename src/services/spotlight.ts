import { supabase } from './supabase';
import { useNotificationStore, SpotlightItem } from '../store/notificationStore';

export interface RemoteSpotlightItem {
  id: string;
  type: 'notification' | 'update' | 'news';
  title: string;
  description: string;
  link?: string;
  created_at: string;
}

export const fetchSpotlightItems = async (): Promise<RemoteSpotlightItem[]> => {
  const { data, error } = await supabase
    .from('spotlight')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching spotlight items:', error);
    return [];
  }

  return data || [];
};

export const syncSpotlight = async () => {
  const remoteItems = await fetchSpotlightItems();

  const mappedItems: SpotlightItem[] = remoteItems.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    timestamp: item.created_at,
    isRead: false, // Will be merged in store
    link: item.link,
  }));

  useNotificationStore.getState().syncRemoteItems(mappedItems);
};
