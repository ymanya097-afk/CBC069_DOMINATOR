import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { familiesRepo } from '../repositories/familiesRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { settingsRepo } from '../repositories/settingsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';

const router = Router();

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/settings - Fetch settings
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const family = await familiesRepo.findById(req.member!.family_id);
    const member = req.member!;
    const notifSettings = await settingsRepo.getByMemberId(member.id);

    res.json({
      family,
      profile: member,
      notificationSettings: notifSettings
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load settings.' });
  }
});

// PUT /api/settings - Update profile & notification settings
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, familyName, notificationSettings } = req.body;
    const member = req.member!;

    if (name || phone !== undefined) {
      await membersRepo.update(member.id, {
        ...(name ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {})
      });
    }

    if (familyName && member.role === 'admin') {
      await familiesRepo.update(member.family_id, { name: familyName.trim() });
    }

    if (notificationSettings) {
      await settingsRepo.updateByMemberId(member.id, notificationSettings);
    }

    const updatedFamily = await familiesRepo.findById(member.family_id);
    const updatedMember = await membersRepo.findById(member.id);
    const updatedNotif = await settingsRepo.getByMemberId(member.id);

    res.json({
      family: updatedFamily,
      profile: updatedMember,
      notificationSettings: updatedNotif
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// POST /api/settings/regenerate-code - Admin generates fresh join code
router.post('/regenerate-code', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can regenerate family join codes.' });
      return;
    }

    const newCode = generateJoinCode();
    const updated = await familiesRepo.updateJoinCode(req.member!.family_id, newCode);

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: req.member!.family_id,
      actor_name: req.member!.name,
      action: 'Join Code Regenerated',
      details: `Generated new join code for the family`,
      created_at: new Date().toISOString()
    });

    res.json({ join_code: newCode, family: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to regenerate join code.' });
  }
});

export default router;
