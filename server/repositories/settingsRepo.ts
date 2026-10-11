import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { NotificationSettings } from '../types.ts';

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'id' | 'member_id'> = {
  email_notifications: true,
  push_notifications: true,
  reminder_hours_before: 24
};

function fromDbSettings(row: any, memberId: string): NotificationSettings {
  if (!row) {
    return {
      id: `settings-${memberId}`,
      member_id: memberId,
      ...DEFAULT_SETTINGS
    };
  }
  return {
    id: row.id,
    member_id: row.member_id || memberId,
    email_notifications: row.email ?? true,
    push_notifications: row.in_app ?? true,
    reminder_hours_before: row.reminder_hours_before ?? 24
  };
}

export const settingsRepo = {
  async getByMemberId(memberId: string, client?: SupabaseClient): Promise<NotificationSettings> {
    const sb = getClient(client);
    const { data } = await sb
      .from('notification_settings')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();

    if (data) {
      return fromDbSettings(data, memberId);
    }

    // Insert default setting
    const { data: created, error } = await sb
      .from('notification_settings')
      .insert({
        member_id: memberId,
        in_app: true,
        email: true,
        deadline_reminders: true,
        reminder_hours_before: 24
      })
      .select()
      .maybeSingle();

    if (error || !created) {
      return {
        id: `settings-${memberId}`,
        member_id: memberId,
        ...DEFAULT_SETTINGS
      };
    }

    return fromDbSettings(created, memberId);
  },

  async updateByMemberId(memberId: string, updates: Partial<NotificationSettings>, client?: SupabaseClient): Promise<NotificationSettings> {
    const sb = getClient(client);
    const dbUpdates: any = {};
    if (updates.email_notifications !== undefined) dbUpdates.email = updates.email_notifications;
    if (updates.push_notifications !== undefined) dbUpdates.in_app = updates.push_notifications;
    if (updates.reminder_hours_before !== undefined) dbUpdates.reminder_hours_before = updates.reminder_hours_before;

    const { data: existing } = await sb
      .from('notification_settings')
      .select('id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (existing) {
      const { data } = await sb
        .from('notification_settings')
        .update(dbUpdates)
        .eq('member_id', memberId)
        .select()
        .single();
      return fromDbSettings(data, memberId);
    } else {
      const { data } = await sb
        .from('notification_settings')
        .insert({
          member_id: memberId,
          in_app: updates.push_notifications ?? true,
          email: updates.email_notifications ?? true,
          deadline_reminders: true,
          reminder_hours_before: updates.reminder_hours_before ?? 24
        })
        .select()
        .single();
      return fromDbSettings(data, memberId);
    }
  }
};
