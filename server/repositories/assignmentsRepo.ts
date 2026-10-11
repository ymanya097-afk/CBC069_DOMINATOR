import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Assignment } from '../types.ts';

function fromDbAssignment(row: any): Assignment {
  return {
    id: row.id,
    task_id: row.task_id,
    member_id: row.member_id,
    status: row.response === 'Pending' ? 'Offered' : row.response,
    reason: row.rejection_reason,
    suggested_reason_sentence: row.reason_text,
    created_at: row.assigned_at || row.created_at
  };
}

export const assignmentsRepo = {
  async findByTaskId(taskId: string, client?: SupabaseClient): Promise<Assignment[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('assignments')
      .select('*')
      .eq('task_id', taskId)
      .order('assigned_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbAssignment);
  },

  async findByMemberId(memberId: string, client?: SupabaseClient): Promise<Assignment[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('assignments')
      .select('*')
      .eq('member_id', memberId)
      .order('assigned_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbAssignment);
  },

  async create(assignment: Partial<Assignment>, client?: SupabaseClient): Promise<Assignment> {
    const sb = getClient(client);
    const dbPayload = {
      task_id: assignment.task_id,
      member_id: assignment.member_id,
      reason_text: assignment.suggested_reason_sentence || '',
      response: assignment.status === 'Offered' ? 'Pending' : (assignment.status || 'Pending'),
      rejection_reason: assignment.reason || null,
      is_current: true
    };

    const { data, error } = await sb
      .from('assignments')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;
    return fromDbAssignment(data);
  },

  async update(id: string, updates: Partial<Assignment>, client?: SupabaseClient): Promise<Assignment | null> {
    const sb = getClient(client);
    const dbPayload: any = {};
    if (updates.status) {
      dbPayload.response = updates.status === 'Offered' ? 'Pending' : updates.status;
    }
    if (updates.reason) {
      dbPayload.rejection_reason = updates.reason;
    }
    if (updates.suggested_reason_sentence) {
      dbPayload.reason_text = updates.suggested_reason_sentence;
    }

    const { data, error } = await sb
      .from('assignments')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return fromDbAssignment(data);
  }
};
