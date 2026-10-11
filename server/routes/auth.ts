import { Router, Response } from 'express';
import { supabasePublic, isSupabaseConfigured, createScopedClient } from '../lib/supabase.ts';
import { familiesRepo } from '../repositories/familiesRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/register - Create account and new family (Admin) via Supabase Auth
router.post('/register', async (req, res: Response) => {
  try {
    if (!isSupabaseConfigured || !supabasePublic) {
      res.status(503).json({ error: 'Supabase configuration missing.', code: 'CONFIG_MISSING' });
      return;
    }

    const { name, email, password, familyName } = req.body;

    if (!name || !email || !password || !familyName) {
      res.status(400).json({ error: 'Name, email, password, and family name are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabasePublic.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name.trim()
        }
      }
    });

    if (authError || !authData?.user) {
      res.status(400).json({ error: authError?.message || 'Failed to create user in Supabase Auth.' });
      return;
    }

    let token = authData.session?.access_token;
    if (!token) {
      // Attempt login to grab token if auto-confirm is enabled
      const { data: loginData } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      token = loginData?.session?.access_token;
    }

    // Scoped client for RLS
    const client = token ? createScopedClient(token) : supabasePublic;
    const authUser = authData.user;

    // Call security-definer RPC function create_family_for_user if available
    let family: any = null;
    let member: any = null;

    if (token) {
      const { data: rpcData, error: rpcErr } = await client.rpc('create_family_for_user', {
        family_name: familyName.trim(),
        full_name: name.trim(),
        phone: null
      });

      if (!rpcErr && rpcData?.family_id) {
        family = await familiesRepo.findById(rpcData.family_id, client);
        if (!family) {
          // If SELECT on families table is blocked by missing GRANT, construct from RPC output
          family = {
            id: rpcData.family_id,
            name: familyName.trim(),
            join_code: rpcData.join_code,
            created_by: authUser.id,
            timezone: 'UTC',
            created_at: new Date().toISOString()
          };
        }

        member = await membersRepo.findById(rpcData.member_id, client);
        if (!member) {
          member = {
            id: rpcData.member_id,
            family_id: rpcData.family_id,
            user_id: authUser.id,
            name: name.trim(),
            email: cleanEmail,
            role: 'admin',
            status: 'Available',
            current_workload_minutes: 0,
            avatar_color: '#d97757',
            created_at: new Date().toISOString()
          };
        }
      } else if (rpcErr) {
        console.warn('create_family_for_user RPC error, attempting direct table insert fallback:', rpcErr.message);
      }
    }

    // Fallback if RPC was not used or failed
    if (!family) {
      const joinCode = generateJoinCode();

      // 2. Create Family
      const { data: createdFam, error: famErr } = await client
        .from('families')
        .insert({
          name: familyName.trim(),
          join_code: joinCode,
          created_by: authUser.id
        })
        .select()
        .single();

      if (famErr || !createdFam) {
        throw famErr || new Error('Could not create family record');
      }
      family = createdFam;

      // 3. Create public.users entry
      await client
        .from('users')
        .upsert({
          id: authUser.id,
          email: cleanEmail,
          full_name: name.trim(),
          family_id: family.id,
          role: 'admin'
        });

      // 4. Create Member
      const { data: createdMem, error: memErr } = await client
        .from('members')
        .insert({
          family_id: family.id,
          user_id: authUser.id,
          name: name.trim(),
          email: cleanEmail,
          phone: '',
          role: 'admin',
          status: 'Available',
          avatar_color: '#d97757'
        })
        .select()
        .single();

      if (memErr || !createdMem) {
        throw memErr || new Error('Could not create member record');
      }
      member = createdMem;
    }

    if (!member) {
      member = await membersRepo.findByUserId(authUser.id, client);
    }

    // 5. Initialize availability & preferences
    if (member?.id) {
      await availabilityRepo.upsert(member.id, availabilityRepo.getDefaultSchedule(), client);
      await preferencesRepo.upsert(member.id, preferencesRepo.getAllCategories(), client);

      // 6. Log Activity
      await activityLogsRepo.create({
        family_id: family.id,
        actor_name: member.name,
        action: 'Family Created',
        details: `${member.name} created family "${family.name}"`
      }, client);
    }

    res.status(201).json({
      token: token || authUser.id,
      user: { id: authUser.id, email: authUser.email },
      member,
      family
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Server error during registration.' });
  }
});

// POST /api/login - Log in with Supabase Auth
router.post('/login', async (req, res: Response) => {
  try {
    if (!isSupabaseConfigured || !supabasePublic) {
      res.status(503).json({ error: 'Supabase configuration missing.', code: 'CONFIG_MISSING' });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (authError || !authData?.user || !authData.session) {
      res.status(401).json({ error: authError?.message || 'Invalid email or password.' });
      return;
    }

    const token = authData.session.access_token;
    const client = createScopedClient(token);

    // Load member
    let member = await membersRepo.findByUserId(authData.user.id, client);
    if (!member) {
      // Check if user has an invite or profile
      const { data: userProfile } = await client
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (userProfile?.family_id) {
        member = await membersRepo.create({
          family_id: userProfile.family_id,
          user_id: authData.user.id,
          name: userProfile.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: userProfile.role || 'member',
          status: 'Available'
        }, client);
      }
    }

    if (!member) {
      res.status(404).json({ error: 'Member profile not found for this account.' });
      return;
    }

    const family = await familiesRepo.findById(member.family_id, client);
    if (!family) {
      res.status(404).json({ error: 'Family not found.' });
      return;
    }

    res.json({
      token,
      user: { id: authData.user.id, email: authData.user.email },
      member,
      family
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error during login.' });
  }
});

// POST /api/join - Join existing family with join code
router.post('/join', async (req, res: Response) => {
  try {
    if (!isSupabaseConfigured || !supabasePublic) {
      res.status(503).json({ error: 'Supabase configuration missing.', code: 'CONFIG_MISSING' });
      return;
    }

    const { code, name, email, password } = req.body;

    if (!code || !name || !email || !password) {
      res.status(400).json({ error: 'Family code, name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Sign up with Supabase Auth first
    const { data: authData, error: authError } = await supabasePublic.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: name.trim() }
      }
    });

    if (authError || !authData?.user) {
      res.status(400).json({ error: authError?.message || 'Failed to register account.' });
      return;
    }

    let token = authData.session?.access_token;
    if (!token) {
      const { data: loginData } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      token = loginData?.session?.access_token;
    }

    const client = token ? createScopedClient(token) : supabasePublic;
    const authUser = authData.user;

    let member: any = null;
    let familyId: string | null = null;

    if (token) {
      const { data: rpcData, error: rpcErr } = await client.rpc('join_family_with_code', {
        code: cleanCode,
        full_name: name.trim(),
        phone: null
      });

      if (rpcErr) {
        res.status(400).json({ error: rpcErr.message || 'Invalid or expired family join code.' });
        return;
      }

      if (rpcData?.family_id) {
        familyId = rpcData.family_id;
        member = await membersRepo.findById(rpcData.member_id, client);
        if (!member) {
          member = {
            id: rpcData.member_id,
            family_id: rpcData.family_id,
            user_id: authUser.id,
            name: name.trim(),
            email: cleanEmail,
            role: 'member',
            status: 'Available',
            current_workload_minutes: 0,
            avatar_color: '#6a9bcc',
            created_at: new Date().toISOString()
          };
        }
      }
    }

    if (!member) {
      // Fallback: check families table
      const foundFamily = await familiesRepo.findByCode(cleanCode);
      if (!foundFamily) {
        res.status(404).json({ error: 'Invalid family join code. Please check and try again.' });
        return;
      }
      familyId = foundFamily.id;

      // Create user record
      await client
        .from('users')
        .upsert({
          id: authUser.id,
          email: cleanEmail,
          full_name: name.trim(),
          family_id: foundFamily.id,
          role: 'member'
        });

      const memberColors = ['#6a9bcc', '#788c5d', '#d97757', '#9381ff', '#b8b08d'];
      const assignedColor = memberColors[Math.floor(Math.random() * memberColors.length)];

      const { data: createdMem, error: memErr } = await client
        .from('members')
        .insert({
          family_id: foundFamily.id,
          user_id: authUser.id,
          name: name.trim(),
          email: cleanEmail,
          phone: '',
          role: 'member',
          status: 'Available',
          avatar_color: assignedColor
        })
        .select()
        .single();

      if (memErr || !createdMem) {
        throw memErr || new Error('Failed to create member record');
      }
      member = createdMem;
    }

    const family = (familyId ? await familiesRepo.findById(familyId, client) : null) || {
      id: familyId || member.family_id,
      name: 'Household',
      join_code: cleanCode,
      timezone: 'UTC',
      created_at: new Date().toISOString()
    };

    if (!member) {
      member = await membersRepo.findByUserId(authUser.id, client);
    }

    if (member?.id) {
      await availabilityRepo.upsert(member.id, availabilityRepo.getDefaultSchedule(), client);
      await preferencesRepo.upsert(member.id, preferencesRepo.getAllCategories(), client);

      await activityLogsRepo.create({
        family_id: family.id,
        actor_name: member.name,
        action: 'Member Joined',
        details: `${member.name} joined the family using join code`
      }, client);
    }

    res.status(201).json({
      token: token || authUser.id,
      user: { id: authUser.id, email: authUser.email },
      member,
      family
    });
  } catch (err: any) {
    console.error('Join family error:', err);
    res.status(500).json({ error: err.message || 'Server error while joining family.' });
  }
});

// POST /api/forgot-password - Reset password using Supabase Auth
router.post('/forgot-password', async (req, res: Response) => {
  try {
    if (!isSupabaseConfigured || !supabasePublic) {
      res.status(503).json({ error: 'Supabase configuration missing.', code: 'CONFIG_MISSING' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabasePublic.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      console.warn('Supabase resetPasswordForEmail:', error.message);
    }

    res.json({
      message: 'If an account exists with this email, password reset instructions have been sent.',
      verified: true
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// GET /api/me - Retrieve authenticated profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const member = req.member!;
    const client = req.supabase;
    const family = await familiesRepo.findById(user.family_id, client);

    res.json({
      user: { id: user.id, email: user.email },
      member,
      family
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
});

export default router;
