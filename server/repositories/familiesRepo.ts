import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Family } from '../types.ts';

export const familiesRepo = {
  async findById(id: string, client?: SupabaseClient): Promise<Family | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('families')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data as Family;
  },

  async findByCode(code: string, client?: SupabaseClient): Promise<Family | null> {
    const sb = getClient(client);
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await sb
      .from('families')
      .select('*')
      .eq('join_code', cleanCode)
      .maybeSingle();

    if (error || !data) return null;
    return data as Family;
  },

  async create(family: Partial<Family>, client?: SupabaseClient): Promise<Family> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('families')
      .insert(family)
      .select()
      .single();

    if (error) throw error;
    return data as Family;
  },

  async update(id: string, updates: Partial<Family>, client?: SupabaseClient): Promise<Family | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('families')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return data as Family;
  },

  async updateJoinCode(id: string, newCode: string, client?: SupabaseClient): Promise<Family | null> {
    return this.update(id, { join_code: newCode }, client);
  }
};
