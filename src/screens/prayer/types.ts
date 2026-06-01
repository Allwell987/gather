import type { PrayerCategory } from '../../types/database';

export type FilterTab = 'All' | 'Mine' | 'Answered' | 'Urgent';

export interface PrayerRequestUI {
  id: string;
  name: string;
  initials: string;
  avatarColor?: string;
  isAnonymous: boolean;
  category: PrayerCategory;
  text: string;
  timeAgo: string;
  prayingCount: number;
  replyCount: number;
  status: 'open' | 'answered' | 'urgent';
  isMyRequest?: boolean;
  userPraying?: boolean;
  syncStatus?: 'pending';
}
