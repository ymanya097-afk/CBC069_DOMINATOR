import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { ActivityLog } from '../types.ts';

function fromDbLog(row: any): ActivityLog {
  return {
    id: row.id,
    family_id: row.family_id,
    actor_name: row.actor_name || 'Member',
    action: row.action,
    details: row.message || row.details || '',
    created_at: row.created_at
  };
}

export const activityLogsRepo = {
  async findByFamilyId(familyId: string, limit = 50, client?: SupabaseClient): Promise<ActivityLog[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('activity_logs')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(fromDbLog);
  },

  async create(log: Partial<ActivityLog> & { family_id: string; action: string; actor_name?: string; details?: string }, client?: SupabaseClient): Promise<ActivityLog> {
    const sb = getClient(client);
    const insertObj: any = {
      family_id: log.family_id,
      actor_name: log.actor_name || 'House Hub',
      action: log.action,
      message: log.details || ''
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (log.id && uuidRegex.test(log.id)) {
      insertObj.id = log.id;
    }

    const { data, error } = await sb
      .from('activity_logs')
      .insert(insertObj)
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert activity log:', error.message);
      return {
        id: log.id || `log-${Date.now()}`,
        family_id: log.family_id,
        actor_name: log.actor_name || 'House Hub',
        action: log.action,
        details: log.details || '',
        created_at: new Date().toISOString()
      };
    }

    return fromDbLog(data);
  }
};
