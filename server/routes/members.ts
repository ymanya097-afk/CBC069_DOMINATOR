import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { usersRepo } from '../repositories/usersRepo.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { handleMemberStatusChange } from '../services/reassignmentService.ts';
import { Member, MemberStatus } from '../types.ts';
import { supabasePublic } from '../lib/supabase.ts';

const router = Router();

// GET /api/members - List members of the family
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const [members, tasks] = await Promise.all([
      membersRepo.findByFamilyId(familyId),
      tasksRepo.findByFamilyId(familyId)
    ]);

    // Enrich with availability, preferences, and current workload
    const enrichedMembers = await Promise.all(
      members.map(async m => {
        const [avail, pref] = await Promise.all([
          availabilityRepo.findByMemberId(m.id),
          preferencesRepo.findByMemberId(m.id)
        ]);

        const activeTasks = tasks.filter(
          t => t.assigned_to_member_id === m.id &&
          (t.status === 'Assigned' || t.status === 'Accepted' || t.status === 'In Progress')
        );

        const currentWorkloadMinutes = activeTasks.reduce((sum, t) => sum + (t.effort || 0), 0);

        return {
          ...m,
          availability: avail ? avail.slots : availabilityRepo.getDefaultSchedule(),
          preferences: pref ? pref.categories : preferencesRepo.getAllCategories(),
          currentWorkloadMinutes,
          activeTaskCount: activeTasks.length
        };
      })
    );

    res.json(enrichedMembers);
  } catch (err: any) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch family members.' });
  }
});

// GET /api/members/:id - Get single member
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const member = await membersRepo.findById(req.params.id);
    if (!member || member.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    const [avail, pref] = await Promise.all([
      availabilityRepo.findByMemberId(member.id),
      preferencesRepo.findByMemberId(member.id)
    ]);

    res.json({
      ...member,
      availability: avail ? avail.slots : availabilityRepo.getDefaultSchedule(),
      preferences: pref ? pref.categories : preferencesRepo.getAllCategories()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch member details.' });
  }
});

// POST /api/members - Create member (Admin only)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can add members directly.' });
      return;
    }

    const { name, email, phone, role, status, availability, preferences } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Member name is required.' });
      return;
    }

    const familyId = req.member!.family_id;
    const client = req.supabase || supabasePublic!;

    // Check if user already exists with this email
    let userId: string | null = null;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (cleanEmail) {
      const existingUser = await usersRepo.findByEmail(cleanEmail, client);
      if (existingUser) {
        if (existingUser.family_id === familyId) {
          const existingMember = await membersRepo.findByUserId(existingUser.id, client);
          if (existingMember) {
            res.status(400).json({ error: 'A member with this email already belongs to your family.' });
            return;
          }
        }
        userId = existingUser.id;
      }
    }

    const colors = ['#6a9bcc', '#788c5d', '#d97757', '#9381ff', '#b8b08d'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];

    const createdMember = await membersRepo.create({
      family_id: familyId,
      user_id: userId || undefined,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      role: role === 'admin' ? 'admin' : 'member',
      status: (status as MemberStatus) || 'Available',
      avatar_color
    }, client);

    const defaultSlots = availabilityRepo.getDefaultSchedule();
    await availabilityRepo.upsert(createdMember.id, availability || defaultSlots, client);

    const defaultCats = preferencesRepo.getAllCategories();
    await preferencesRepo.upsert(createdMember.id, preferences || defaultCats, client);

    await activityLogsRepo.create({
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Member Added',
      details: `Added new member ${createdMember.name} (${createdMember.role})`
    }, client);

    res.status(201).json(createdMember);
  } catch (err: any) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: err?.message || 'Failed to create member.' });
  }
});

// PUT /api/members/:id - Update member details (Admins or self)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    const currentMember = req.member!;
    const isAdmin = currentMember.role === 'admin';
    const isSelf = currentMember.id === memberId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: 'Permission denied. You can only edit your own profile.' });
      return;
    }

    const targetMember = await membersRepo.findById(memberId);
    if (!targetMember || targetMember.family_id !== currentMember.family_id) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    const { name, phone, status, role, availability, preferences } = req.body;

    const updates: Partial<Member> = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone;
    if (isAdmin && role) updates.role = role;

    // Check status change
    let statusChanged = false;
    let oldStatus = targetMember.status;
    if (status && status !== targetMember.status) {
      statusChanged = true;
      updates.status = status as MemberStatus;
    }

    const updatedMember = await membersRepo.update(memberId, updates);

    // Update availability if provided
    if (availability) {
      await availabilityRepo.upsert(memberId, availability);
    }

    // Update preferences if provided
    if (preferences) {
      await preferencesRepo.upsert(memberId, preferences);
    }

    // Handle status transition (auto-reassign if switching from Available to Busy/Away/Offline)
    let reassignReport = null;
    if (statusChanged && updates.status) {
      reassignReport = await handleMemberStatusChange(
        memberId,
        updates.status,
        currentMember.name
      );
    }

    res.json({
      member: updatedMember,
      reassignedTasks: reassignReport
    });
  } catch (err: any) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: 'Failed to update member.' });
  }
});

// DELETE /api/members/:id - Delete member (Admin only)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Admin privileges required to remove members.' });
      return;
    }

    const targetMember = await membersRepo.findById(req.params.id);
    if (!targetMember || targetMember.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    if (targetMember.id === req.member!.id) {
      res.status(400).json({ error: 'You cannot delete your own admin profile.' });
      return;
    }

    await membersRepo.delete(targetMember.id);
    if (targetMember.user_id) {
      await usersRepo.delete(targetMember.user_id);
    }

    // Unassign tasks assigned to this member
    const familyTasks = await tasksRepo.findByFamilyId(req.member!.family_id);
    for (const t of familyTasks) {
      if (t.assigned_to_member_id === targetMember.id && t.status !== 'Completed') {
        await tasksRepo.update(t.id, {
          assigned_to_member_id: null,
          status: 'Pending',
          assigned_reason: 'Assigned member was removed from family.'
        });
      }
    }

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: req.member!.family_id,
      actor_name: req.member!.name,
      action: 'Member Removed',
      details: `Removed member ${targetMember.name}`,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, message: `Member ${targetMember.name} has been removed.` });
  } catch (err: any) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete member.' });
  }
});

// GET /api/members/:id/availability
router.get('/:id/availability', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const avail = await availabilityRepo.findByMemberId(req.params.id);
    res.json(avail ? avail.slots : availabilityRepo.getDefaultSchedule());
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load availability.' });
  }
});

// PUT /api/members/:id/availability
router.put('/:id/availability', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    if (req.member!.role !== 'admin' && req.member!.id !== memberId) {
      res.status(403).json({ error: 'You can only update your own availability.' });
      return;
    }

    const { slots } = req.body;
    if (!slots) {
      res.status(400).json({ error: 'Availability slots are required.' });
      return;
    }

    const updated = await availabilityRepo.upsert(memberId, slots);
    res.json(updated.slots);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save availability.' });
  }
});

// GET /api/members/:id/preferences
router.get('/:id/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pref = await preferencesRepo.findByMemberId(req.params.id);
    res.json(pref ? pref.categories : preferencesRepo.getAllCategories());
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load preferences.' });
  }
});

// PUT /api/members/:id/preferences
router.put('/:id/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberId = req.params.id;
    if (req.member!.role !== 'admin' && req.member!.id !== memberId) {
      res.status(403).json({ error: 'You can only update your own preferences.' });
      return;
    }

    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      res.status(400).json({ error: 'Categories array is required.' });
      return;
    }

    const updated = await preferencesRepo.upsert(memberId, categories);
    res.json(updated.categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

export default router;
