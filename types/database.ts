// types/database.ts — mirrors the Supabase schema
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:           string
          username:     string
          display_name: string
          bio:          string
          location:     string
          website:      string
          avatar_url:   string
          banner_url:   string
          role:         'user' | 'mod' | 'admin'
          verified:     boolean
          post_count:   number
          reply_count:  number
          like_count:   number
          created_at:   string
          updated_at:   string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; username: string; display_name: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      boards: {
        Row: { id: string; name: string; description: string; icon: string; color: string; thread_count: number; created_at: string }
        Insert: Omit<Database['public']['Tables']['boards']['Row'], 'thread_count' | 'created_at'>
        Update: Partial<Database['public']['Tables']['boards']['Row']>
      }
      threads: {
        Row: {
          id:          string
          board_id:    string
          author_id:   string
          title:       string
          body:        string
          image_url:   string
          pinned:      boolean
          locked:      boolean
          reply_count: number
          like_count:  number
          view_count:  number
          created_at:  string
          updated_at:  string
        }
        Insert: { board_id: string; author_id: string; title: string; body: string; image_url?: string }
        Update: Partial<Database['public']['Tables']['threads']['Row']>
      }
      replies: {
        Row: {
          id:         string
          thread_id:  string
          author_id:  string
          body:       string
          image_url:  string
          like_count: number
          created_at: string
          updated_at: string
        }
        Insert: { thread_id: string; author_id: string; body: string; image_url?: string }
        Update: Partial<Database['public']['Tables']['replies']['Row']>
      }
      likes: {
        Row: { id: string; user_id: string; thread_id: string | null; reply_id: string | null; created_at: string }
        Insert: { user_id: string; thread_id?: string | null; reply_id?: string | null }
        Update: never
      }
      reports: {
        Row: {
          id:          string
          reporter_id: string | null
          thread_id:   string | null
          reply_id:    string | null
          reason:      string
          description: string
          status:      'pending' | 'resolved' | 'dismissed'
          resolved_by: string | null
          created_at:  string
          resolved_at: string | null
        }
        Insert: { reporter_id?: string; thread_id?: string; reply_id?: string; reason: string; description?: string }
        Update: Partial<Database['public']['Tables']['reports']['Row']>
      }
      notifications: {
        Row: { id: string; user_id: string; type: string; title: string; body: string; link: string; read: boolean; created_at: string }
        Insert: { user_id: string; type: string; title: string; body: string; link?: string }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
      }
      bans: {
        Row: { id: string; user_id: string; banned_by: string | null; reason: string; expires_at: string | null; created_at: string }
        Insert: { user_id: string; banned_by?: string; reason: string; expires_at?: string }
        Update: never
      }
    }
  }
}

// ─── Joined / enriched types used across the app ─────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']

export type Thread = Database['public']['Tables']['threads']['Row'] & {
  author:    Profile
  board:     Database['public']['Tables']['boards']['Row']
  liked_by_me?: boolean
}

export type Reply = Database['public']['Tables']['replies']['Row'] & {
  author: Profile
  liked_by_me?: boolean
}

export type Board  = Database['public']['Tables']['boards']['Row']
export type Report = Database['public']['Tables']['reports']['Row'] & { reporter?: Profile; thread?: Pick<Thread,'id'|'title'>; reply?: Pick<Reply,'id'|'body'> }
export type Notification = Database['public']['Tables']['notifications']['Row']
