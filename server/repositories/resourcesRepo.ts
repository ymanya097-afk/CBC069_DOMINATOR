import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Resource, ResourceType } from '../types.ts';

function normalizeType(t: string): string {
  const lower = t.toLowerCase();
  if (lower === 'supplies' || lower === 'supply') return 'Supply';
  if (lower === 'appliances' || lower === 'appliance') return 'Appliance';
  if (lower === 'tools' || lower === 'tool') return 'Tool';
  if (lower === 'bills' || lower === 'bill') return 'Bill';
  return 'Supply';
}

function fromDbType(t: string): ResourceType {
  const lower = t.toLowerCase();
  if (lower.startsWith('suppl')) return 'supplies';
  if (lower.startsWith('applian')) return 'appliances';
  if (lower.startsWith('tool')) return 'tools';
  if (lower.startsWith('bill')) return 'bills';
  return 'supplies';
}

function fromDbResource(r: any): Resource {
  return {
    ...r,
    type: fromDbType(r.type)
  };
}

export const resourcesRepo = {
  async findById(id: string, client?: SupabaseClient): Promise<Resource | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('resources')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return fromDbResource(data);
  },

  async findByFamilyId(familyId: string, client?: SupabaseClient): Promise<Resource[]> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('resources')
      .select('*')
      .eq('family_id', familyId)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data.map(fromDbResource);
  },

  async create(resource: Partial<Resource>, client?: SupabaseClient): Promise<Resource> {
    const sb = getClient(client);
    const dbPayload = {
      ...resource,
      type: normalizeType(resource.type || 'Supply')
    };

    const { data, error } = await sb
      .from('resources')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;
    return fromDbResource(data);
  },

  async update(id: string, updates: Partial<Resource>, client?: SupabaseClient): Promise<Resource | null> {
    const sb = getClient(client);
    const dbPayload: any = { ...updates };
    if (updates.type) {
      dbPayload.type = normalizeType(updates.type);
    }

    const { data, error } = await sb
      .from('resources')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return fromDbResource(data);
  },

  async delete(id: string, client?: SupabaseClient): Promise<boolean> {
    const sb = getClient(client);
    const { error } = await sb
      .from('resources')
      .delete()
      .eq('id', id);

    return !error;
  }
};
