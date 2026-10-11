import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { User } from '../types.ts';

export const usersRepo = {
  async findById(id: string, client?: SupabaseClient): Promise<User | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      password_hash: '',
      family_id: data.family_id,
      created_at: data.created_at
    };
  },

  async findByEmail(email: string, client?: SupabaseClient): Promise<User | null> {
    const sb = getClient(client);
    const cleanEmail = email.toLowerCase().trim();
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      password_hash: '',
      family_id: data.family_id,
      created_at: data.created_at
    };
  },

  async create(user: Partial<User> & { id: string; email: string; family_id: string; full_name?: string; role?: string }, client?: SupabaseClient): Promise<User> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('users')
      .insert({
        id: user.id,
        email: user.email.toLowerCase().trim(),
        full_name: user.full_name || '',
        family_id: user.family_id || null,
        role: user.role || 'member'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      password_hash: '',
      family_id: data.family_id,
      created_at: data.created_at
    };
  },

  async update(id: string, updates: Partial<User> & { full_name?: string; role?: string }, client?: SupabaseClient): Promise<User | null> {
    const sb = getClient(client);
    const dbUpdates: any = {};
    if (updates.email) dbUpdates.email = updates.email.toLowerCase().trim();
    if (updates.family_id !== undefined) dbUpdates.family_id = updates.family_id;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;

    const { data, error } = await sb
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      password_hash: '',
      family_id: data.family_id,
      created_at: data.created_at
    };
  },

  async delete(id: string, client?: SupabaseClient): Promise<boolean> {
    const sb = getClient(client);
    const { error } = await sb
      .from('users')
      .delete()
      .eq('id', id);

    return !error;
  }
};
