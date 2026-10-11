import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Task, TaskStatus } from '../types.ts';

function toDbTask(t: Partial<Task>): any {
  const dbObj: any = { ...t };
  if ('effort' in t && t.effort !== undefined) {
    dbObj.effort_minutes = t.effort;
    delete dbObj.effort;
  }
  if ('recurring' in t && t.recurring !== undefined) {
    dbObj.recurrence = t.recurring;
    delete dbObj.recurring;
  }
  if ('parent_task_id' in t) {
    dbObj.recurrence_parent_id = t.parent_task_id;
    delete dbObj.parent_task_id;
  }
  if ('assigned_to_member_id' in t) {
    dbObj.assignee_id = t.assigned_to_member_id;
    delete dbObj.assigned_to_member_id;
  }
  // If id is not a valid UUID (e.g. legacy 'tsk-...'), omit it to let PostgreSQL generate gen_random_uuid()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (dbObj.id && !uuidRegex.test(dbObj.id)) {
    delete dbObj.id;
  }
  // Strip nested joined relations
  delete dbObj.assignedMember;
  delete dbObj.resource;
  return dbObj;
}

function fromDbTask(row: any): Task {
  return {
    id: row.id,
    family_id: row.family_id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    priority: row.priority,
    effort: row.effort_minutes ?? row.effort ?? 30,
    deadline: row.deadline,
    room: row.room || 'General',
    resource_id: row.resource_id,
    recurring: row.recurrence ?? row.recurring ?? 'None',
    status: row.status,
    assigned_to_member_id: row.assignee_id ?? row.assigned_to_member_id ?? null,
    assigned_reason: row.assigned_reason,
    flagged_for_admin: row.flagged_for_admin,
    flag_reason: row.flag_reason,
    started_at: row.started_at,
    completed_at: row.completed_at,
    parent_task_id: row.recurrence_parent_id,
    reminded_24h: row.reminded_24h,
    reminded_2h: row.reminded_2h,
    created_at: row.created_at
  } as Task;
}

export const tasksRepo = {
  async getAll(client?: SupabaseClient): Promise<Task[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('tasks')
      .select('*')
      .order('deadline', { ascending: true });

    if (error || !data) return [];
    return data.map(fromDbTask);
  },

  async findById(id: string, client?: SupabaseClient): Promise<Task | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return fromDbTask(data);
  },

  async findByFamilyId(familyId: string, client?: SupabaseClient): Promise<Task[]> {
    const sb = getClient(client);
    let query = sb.from('tasks').select('*');
    if (familyId) {
      query = query.eq('family_id', familyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbTask);
  },

  async findByMemberId(memberId: string, client?: SupabaseClient): Promise<Task[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('tasks')
      .select('*')
      .eq('assignee_id', memberId)
      .order('deadline', { ascending: true });

    if (error || !data) return [];
    return data.map(fromDbTask);
  },

  async create(task: Partial<Task>, client?: SupabaseClient): Promise<Task> {
    const sb = getClient(client);
    const dbPayload = toDbTask(task);
    const { data, error } = await sb
      .from('tasks')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;
    return fromDbTask(data);
  },

  async update(id: string, updates: Partial<Task>, client?: SupabaseClient): Promise<Task | null> {
    const sb = getClient(client);
    const dbPayload = toDbTask(updates);
    const { data, error } = await sb
      .from('tasks')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return fromDbTask(data);
  },

  async updateStatus(id: string, status: TaskStatus, client?: SupabaseClient): Promise<Task | null> {
    return this.update(id, { status }, client);
  },

  async delete(id: string, client?: SupabaseClient): Promise<boolean> {
    const sb = getClient(client);
    const { error } = await sb
      .from('tasks')
      .delete()
      .eq('id', id);

    return !error;
  }
};
