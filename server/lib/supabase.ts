import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Base public client (anon)
export const supabasePublic = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Per-request scoped client with caller JWT for Row Level Security (RLS) enforcement
export function createScopedClient(accessToken: string): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase URL and Anon Key are not configured.');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
