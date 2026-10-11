import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const memberId = req.member!.id;
    const notifications = await notificationsRepo.findByFamilyId(familyId, memberId);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      notifications,
      unreadCount
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// POST /api/notifications/:id/read - Mark single as read
router.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await notificationsRepo.markAsRead(req.params.id);
    res.json({ success: true, notification: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const memberId = req.member!.id;
    const count = await notificationsRepo.markAllAsRead(familyId, memberId);
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export default router;
