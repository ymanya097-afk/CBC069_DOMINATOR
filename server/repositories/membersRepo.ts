import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Member, MemberStatus } from '../types.ts';

export const membersRepo = {
  async findById(id: string, client?: SupabaseClient): Promise<Member | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data as Member;
  },

  async findByUserId(userId: string, client?: SupabaseClient): Promise<Member | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as Member;
  },

  async findByFamilyId(familyId: string, client?: SupabaseClient): Promise<Member[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as Member[];
  },

  async create(member: Partial<Member>, client?: SupabaseClient): Promise<Member> {
    const sb = getClient(client);
    const insertObj: any = { ...member };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (insertObj.id && !uuidRegex.test(insertObj.id)) {
      delete insertObj.id;
    }
    if (insertObj.user_id && !uuidRegex.test(insertObj.user_id)) {
      insertObj.user_id = null;
    }

    const { data, error } = await sb
      .from('members')
      .insert(insertObj)
      .select()
      .single();

    if (error) throw error;
    return data as Member;
  },

  async update(id: string, updates: Partial<Member>, client?: SupabaseClient): Promise<Member | null> {
    const sb = getClient(client);
    const updateObj: any = { ...updates };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    delete updateObj.id;
    if (updateObj.user_id && !uuidRegex.test(updateObj.user_id)) {
      delete updateObj.user_id;
    }

    const { data, error } = await sb
      .from('members')
      .update(updateObj)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return data as Member;
  },

  async updateStatus(id: string, status: MemberStatus, client?: SupabaseClient): Promise<Member | null> {
    return this.update(id, { status }, client);
  },

  async delete(id: string, client?: SupabaseClient): Promise<boolean> {
    const sb = getClient(client);
    const { error } = await sb
      .from('members')
      .delete()
      .eq('id', id);

    return !error;
  }
};
