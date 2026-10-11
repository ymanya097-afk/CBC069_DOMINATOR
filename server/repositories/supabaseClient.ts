import { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublic } from '../lib/supabase.ts';

export function getClient(client?: SupabaseClient): SupabaseClient {
  if (client) return client;
  if (supabasePublic) return supabasePublic;
  throw new Error('Supabase client is not available. Please verify your credentials.');
}
