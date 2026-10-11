import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Notification } from '../types.ts';

function fromDbNotification(row: any): Notification {
  return {
    id: row.id,
    family_id: row.family_id,
    member_id: row.member_id || null,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.is_read ?? row.read ?? false,
    created_at: row.created_at
  };
}

export const notificationsRepo = {
  async findByFamilyId(familyId: string, memberId?: string, client?: SupabaseClient): Promise<Notification[]> {
    const sb = getClient(client);
    let query = sb
      .from('notifications')
      .select('*')
      .eq('family_id', familyId);

    if (memberId) {
      query = query.or(`member_id.eq.${memberId},member_id.is.null`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(fromDbNotification);
  },

  async create(notification: Partial<Notification> & { family_id: string; title: string; message: string; type: string }, client?: SupabaseClient): Promise<Notification> {
    const sb = getClient(client);
    const insertObj: any = {
      family_id: notification.family_id,
      member_id: notification.member_id || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.read ?? false
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (notification.id && uuidRegex.test(notification.id)) {
      insertObj.id = notification.id;
    }

    const { data, error } = await sb
      .from('notifications')
      .insert(insertObj)
      .select()
      .single();

    if (error) throw error;
    return fromDbNotification(data);
  },

  async markAsRead(id: string, client?: SupabaseClient): Promise<Notification | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return fromDbNotification(data);
  },

  async markAllAsRead(familyId: string, memberId?: string, client?: SupabaseClient): Promise<boolean> {
    const sb = getClient(client);
    let query = sb
      .from('notifications')
      .update({ is_read: true })
      .eq('family_id', familyId);

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { error } = await query;
    return !error;
  }
};
