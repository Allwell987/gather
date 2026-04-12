// src/types/database.ts
export type ProfileRole = 'member' | 'leader' | 'pastor' | 'admin';
export type BibleVersion = 'niv' | 'kjv' | 'nkjv';
export type PrayerCategory = 'Health' | 'Family' | 'Provision' | 'Studies' | 'Missions' | 'Testimony' | 'general';
export type EventCategory = 'worship' | 'prayer' | 'bible_study' | 'fellowship' | 'service';
export type GivingCategory = 'tithe' | 'offering' | 'project' | 'benevolence' | 'app_maintenance';
export type GivingStatus = 'pending' | 'success' | 'failed';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  church_id: string | null;
  role: ProfileRole;
  is_verified: boolean;
  bible_version: BibleVersion;
  reminder_time: string;
  streak_count: number;
  streak_last_date: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: JoinRequestStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  display_picture_url: string | null;
  created_by: string | null;
  member_count: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatGroupAdmin {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatGroupAdminAuditLog {
  id: string;
  group_id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChatGroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatGroupJoinRequestWithProfile extends ChatGroupJoinRequest {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'email'>;
}

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  reply_to_message_id: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface MessageWithSender extends Message {
  senderName: string;
  senderInitials: string;
  senderColor: string;
  isMine: boolean;
  isVerified?: boolean;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  category: PrayerCategory;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  prayer_count: number;
  created_at: string;
  updated_at: string;
  status: 'open' | 'answered' | 'urgent';
}

export interface PrayerRequestWithProfile extends PrayerRequest {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'is_verified'>;
}

export interface PrayerResponse {
  id: string;
  prayer_request_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface PrayerResponseWithProfile extends PrayerResponse {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'is_verified'>;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: EventCategory;
  start_time: string;
  end_time: string;
  location: string | null;
  capacity: number;
  is_live: boolean;
  live_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventWithRSVP extends Event {
  rsvpCount: number;
  hasRSVP: boolean;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Giving {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: string;
  payment_reference: string | null;
  status: string;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  goal_amount: number;
  raised_amount: number;
  is_active: boolean;
  bg_color: string | null;
  progress_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface BibleHighlight {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  color: HighlightColor;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface BibleNote {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Devotional {
  id: string;
  publish_date: string;
  title: string;
  anchor_scripture: string;
  opening_charge: string;
  core_teaching: string;
  supporting_scriptures: string[];
  spiritual_insight: string;
  biblical_example: string;
  warning_correction: string;
  declaration: string;
  summary: string;
  theme: string;
  month_focus: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>;
        Update: Partial<Profile>;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ];
      };
      chat_groups: {
        Row: ChatGroup;
        Insert: Partial<ChatGroup> & Pick<ChatGroup, 'id' | 'name'>;
        Update: Partial<ChatGroup>;
        Relationships: [
          {
            foreignKeyName: "chat_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      chat_group_members: {
        Row: ChatGroupMember;
        Insert: Partial<ChatGroupMember> & Pick<ChatGroupMember, 'group_id' | 'user_id'>;
        Update: Partial<ChatGroupMember>;
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      chat_group_admins: {
        Row: ChatGroupAdmin;
        Insert: Partial<ChatGroupAdmin> & Pick<ChatGroupAdmin, 'group_id' | 'user_id'>;
        Update: Partial<ChatGroupAdmin>;
        Relationships: [
          {
            foreignKeyName: "chat_group_admins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      chat_group_admin_audit_logs: {
        Row: ChatGroupAdminAuditLog;
        Insert: Partial<ChatGroupAdminAuditLog> & Pick<ChatGroupAdminAuditLog, 'group_id' | 'actor_user_id' | 'action'>;
        Update: Partial<ChatGroupAdminAuditLog>;
        Relationships: [
          {
            foreignKeyName: "chat_group_admin_audit_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          }
        ];
      };
      chat_group_join_requests: {
        Row: ChatGroupJoinRequest;
        Insert: Partial<ChatGroupJoinRequest> & Pick<ChatGroupJoinRequest, 'group_id' | 'user_id'>;
        Update: Partial<ChatGroupJoinRequest>;
        Relationships: [
          {
            foreignKeyName: "chat_group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          }
        ];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & Pick<Message, 'group_id' | 'user_id' | 'content'>;
        Update: Partial<Message>;
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          }
        ];
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Partial<MessageReaction> & Pick<MessageReaction, 'message_id' | 'user_id' | 'reaction'>;
        Update: Partial<MessageReaction>;
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ];
      };
      message_reads: {
        Row: MessageRead;
        Insert: Partial<MessageRead> & Pick<MessageRead, 'message_id' | 'user_id'>;
        Update: Partial<MessageRead>;
        Relationships: [];
      };
      prayer_requests: {
        Row: PrayerRequest;
        Insert: Partial<PrayerRequest> & Pick<PrayerRequest, 'user_id' | 'title'>;
        Update: Partial<PrayerRequest>;
        Relationships: [
          {
            foreignKeyName: "prayer_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      verification_requests: {
        Row: VerificationRequest;
        Insert: Partial<VerificationRequest> & Pick<VerificationRequest, 'user_id'>;
        Update: Partial<VerificationRequest>;
        Relationships: [];
      };
      prayer_responses: {
        Row: PrayerResponse;
        Insert: Partial<PrayerResponse> & Pick<PrayerResponse, 'prayer_request_id' | 'user_id' | 'comment'>;
        Update: Partial<PrayerResponse>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Partial<Event> & Pick<Event, 'title' | 'start_time' | 'end_time'>;
        Update: Partial<Event>;
        Relationships: [];
      };
      event_rsvps: {
        Row: EventRSVP;
        Insert: Partial<EventRSVP> & Pick<EventRSVP, 'event_id' | 'user_id'>;
        Update: Partial<EventRSVP>;
        Relationships: [];
      };
      giving: {
        Row: Giving;
        Insert: Partial<Giving> & Pick<Giving, 'user_id' | 'amount'>;
        Update: Partial<Giving>;
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: Partial<Campaign> & Pick<Campaign, 'name' | 'goal_amount'>;
        Update: Partial<Campaign>;
        Relationships: [];
      };
      bible_highlights: {
        Row: BibleHighlight;
        Insert: Partial<BibleHighlight> & Pick<BibleHighlight, 'user_id' | 'book' | 'chapter' | 'verse_start' | 'text'>;
        Update: Partial<BibleHighlight>;
        Relationships: [];
      };
      bible_notes: {
        Row: BibleNote;
        Insert: Partial<BibleNote> & Pick<BibleNote, 'user_id' | 'book' | 'chapter' | 'verse_start' | 'note'>;
        Update: Partial<BibleNote>;
        Relationships: [];
      };
      devotionals: {
        Row: Devotional;
        Insert: Partial<Devotional> & Pick<Devotional, 'publish_date' | 'title' | 'anchor_scripture' | 'opening_charge' | 'core_teaching' | 'supporting_scriptures' | 'spiritual_insight' | 'biblical_example' | 'warning_correction' | 'declaration' | 'summary' | 'theme' | 'month_focus'>;
        Update: Partial<Devotional>;
        Relationships: [];
      };
      devotional_reads: {
        Row: {
          id: string;
          user_id: string;
          devotional_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          devotional_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          devotional_id?: string;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devotional_reads_devotional_id_fkey"
            columns: ["devotional_id"]
            isOneToOne: false
            referencedRelation: "devotionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devotional_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
