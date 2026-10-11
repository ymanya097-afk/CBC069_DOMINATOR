import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublic, createScopedClient, isSupabaseConfigured } from '../lib/supabase.ts';
import { User, Member } from '../types.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
  member?: Member;
  supabase?: SupabaseClient;
  token?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isSupabaseConfigured || !supabasePublic) {
      res.status(503).json({
        error: 'Supabase configuration missing.',
        code: 'CONFIG_MISSING'
      });
      return;
    }

    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Missing bearer token.' });
      return;
    }

    // Verify token with Supabase Auth using the anon public key
    const { data: authData, error: authError } = await supabasePublic.auth.getUser(token);

    if (authError || !authData?.user) {
      res.status(401).json({ error: 'Invalid or expired Supabase session. Please sign in again.' });
      return;
    }

    const authUser = authData.user;
    req.token = token;

    // Create per-request Supabase client with caller's token for Row Level Security
    const scopedClient = createScopedClient(token);
    req.supabase = scopedClient;

    // Load profile from public.users
    const { data: userProfile, error: profileErr } = await scopedClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !userProfile) {
      // User may have just signed up and needs to create or join family
      req.user = {
        id: authUser.id,
        email: authUser.email || '',
        password_hash: '',
        family_id: '',
        created_at: authUser.created_at || new Date().toISOString()
      };
      next();
      return;
    }

    // Load member profile from public.members
    const { data: memberProfile } = await scopedClient
      .from('members')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      password_hash: '',
      family_id: userProfile.family_id,
      created_at: userProfile.created_at
    };

    if (memberProfile) {
      req.member = {
        id: memberProfile.id,
        user_id: memberProfile.user_id,
        family_id: memberProfile.family_id,
        name: memberProfile.name,
        email: memberProfile.email,
        phone: memberProfile.phone || '',
        role: memberProfile.role,
        status: memberProfile.status,
        avatar_color: memberProfile.avatar_color,
        created_at: memberProfile.created_at
      };
    }

    next();
  } catch (err: any) {
    console.error('Error in requireAuth middleware:', err);
    res.status(401).json({ error: 'Session validation failed.' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.member || req.member.role !== 'admin') {
    res.status(403).json({ error: 'Access restricted to Family Admins only.' });
    return;
  }
  next();
}
