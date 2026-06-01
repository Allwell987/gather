export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  category: string;
  start_time: string;
  end_time: string;
  location: string;
  is_live: boolean;
  live_url?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  capacity?: number | null;
  emoji: string;
  date: string;
  time: string;
  endTime: string;
  attendees: number;
  stripeColor: string;
  tagBg: string;
  tagColor: string;
  rsvpd: boolean;
  syncStatus?: 'pending';
}
