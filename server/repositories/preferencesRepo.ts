import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Preferences, TaskCategory } from '../types.ts';

const ALL_CATEGORIES: TaskCategory[] = [
  'Cleaning',
  'Cooking',
  'Shopping',
  'Bills',
  'Maintenance',
  'Laundry',
  'Gardening'
];

export const preferencesRepo = {
  async findByMemberId(memberId: string, client?: SupabaseClient): Promise<Preferences | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('preferences')
      .select('category')
      .eq('member_id', memberId);

    if (error || !data || data.length === 0) {
      return {
        id: `pref-${memberId}`,
        member_id: memberId,
        categories: [...ALL_CATEGORIES],
        updated_at: new Date().toISOString()
      };
    }

    return {
      id: `pref-${memberId}`,
      member_id: memberId,
      categories: data.map(r => r.category as TaskCategory),
      updated_at: new Date().toISOString()
    };
  },

  async upsert(memberId: string, categories: TaskCategory[], client?: SupabaseClient): Promise<Preferences> {
    const sb = getClient(client);

    // Delete existing and insert new preferences for member
    await sb.from('preferences').delete().eq('member_id', memberId);

    if (categories && categories.length > 0) {
      const rows = categories.map(cat => ({
        member_id: memberId,
        category: cat
      }));

      const { error } = await sb.from('preferences').insert(rows);
      if (error) console.error('Error saving preferences:', error);
    }

    return {
      id: `pref-${memberId}`,
      member_id: memberId,
      categories,
      updated_at: new Date().toISOString()
    };
  },

  getAllCategories(): TaskCategory[] {
    return [...ALL_CATEGORIES];
  }
};
