import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { ReassignmentRequest } from '../types.ts';

function fromDbReq(row: any): ReassignmentRequest {
  const normStatus = (row.status || 'pending').toLowerCase() as 'pending' | 'approved' | 'declined';
  return {
    id: row.id,
    family_id: row.family_id,
    task_id: row.task_id,
    requesting_member_id: row.requested_by || row.requesting_member_id,
    reason: row.reason,
    status: normStatus,
    created_at: row.created_at,
    reviewed_at: row.decided_at || row.reviewed_at
  };
}

export const reassignmentRepo = {
  async findById(id: string, client?: SupabaseClient): Promise<ReassignmentRequest | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('reassignment_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return fromDbReq(data);
  },

  async findByFamilyId(familyId: string, status?: 'pending' | 'approved' | 'declined', client?: SupabaseClient): Promise<ReassignmentRequest[]> {
    const sb = getClient(client);
    let query = sb
      .from('reassignment_requests')
      .select('*')
      .eq('family_id', familyId);

    if (status) {
      // Allow case matching
      const cap = status.charAt(0).toUpperCase() + status.slice(1);
      query = query.or(`status.eq.${status},status.eq.${cap}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbReq);
  },

  async findByTaskId(taskId: string, client?: SupabaseClient): Promise<ReassignmentRequest[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('reassignment_requests')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbReq);
  },

  async create(req: Partial<ReassignmentRequest> & { task_id: string; reason: string; family_id: string; requesting_member_id: string }, client?: SupabaseClient): Promise<ReassignmentRequest> {
    const sb = getClient(client);
    const dbStatus = req.status ? (req.status.charAt(0).toUpperCase() + req.status.slice(1)) : 'Pending';
    const insertObj: any = {
      family_id: req.family_id,
      task_id: req.task_id,
      requested_by: req.requesting_member_id,
      reason: req.reason,
      status: dbStatus
    };

    if (req.id) insertObj.id = req.id;

    const { data, error } = await sb
      .from('reassignment_requests')
      .insert(insertObj)
      .select()
      .single();

    if (error) throw error;
    return fromDbReq(data);
  },

  async update(id: string, updates: Partial<ReassignmentRequest>, client?: SupabaseClient): Promise<ReassignmentRequest | null> {
    const sb = getClient(client);
    const dbUpdates: any = {};
    if (updates.status) {
      dbUpdates.status = updates.status.charAt(0).toUpperCase() + updates.status.slice(1);
    }
    if (updates.reviewed_at !== undefined) {
      dbUpdates.decided_at = updates.reviewed_at;
    }

    const { data, error } = await sb
      .from('reassignment_requests')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return fromDbReq(data);
  }
};
