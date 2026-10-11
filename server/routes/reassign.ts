import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { reassignmentRepo } from '../repositories/reassignmentRepo.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { assignmentsRepo } from '../repositories/assignmentsRepo.ts';
import { evaluateTaskAssignment } from '../services/assignmentEngine.ts';
import { eventBus } from '../services/eventBus.ts';
import { ReassignmentRequest } from '../types.ts';

const router = Router();

// GET /api/reassign/requests - List reassignment requests for family
router.get('/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const requests = await reassignmentRepo.findByFamilyId(familyId);
    const [tasks, members] = await Promise.all([
      tasksRepo.findByFamilyId(familyId),
      membersRepo.findByFamilyId(familyId)
    ]);

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const memberMap = new Map(members.map(m => [m.id, m]));

    const enriched = requests.map(r => ({
      ...r,
      task: taskMap.get(r.task_id) || null,
      requestingMember: memberMap.get(r.requesting_member_id) || null
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reassignment requests.' });
  }
});

// POST /api/reassign/request - Member requests reassignment
router.post('/request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, reason } = req.body;

    if (!taskId || !reason) {
      res.status(400).json({ error: 'Task ID and reason are required.' });
      return;
    }

    const task = await tasksRepo.findById(taskId);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const requestingMember = req.member!;
    const familyId = task.family_id;
    const now = new Date().toISOString();

    const requestRecord: ReassignmentRequest = {
      id: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      task_id: task.id,
      requesting_member_id: requestingMember.id,
      reason: reason.trim(),
      status: 'pending',
      created_at: now
    };

    await reassignmentRepo.create(requestRecord);

    // Notify admins
    await notificationsRepo.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      member_id: null,
      type: 'task_reassigned',
      title: `Reassignment Request: ${task.title}`,
      message: `${requestingMember.name} requested reassignment: "${reason.trim()}"`,
      link: `/assignments`,
      read: false,
      created_at: now
    });

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      actor_name: requestingMember.name,
      action: 'Reassignment Requested',
      details: `${requestingMember.name} requested reassignment for "${task.title}"`,
      created_at: now
    });

    eventBus.broadcast(familyId, 'data_updated', { type: 'reassignment_request', requestId: requestRecord.id });

    res.status(201).json({
      request: requestRecord,
      message: 'Reassignment request submitted for admin review.'
    });
  } catch (err: any) {
    console.error('Error submitting reassignment request:', err);
    res.status(500).json({ error: 'Failed to submit reassignment request.' });
  }
});

// POST /api/reassign/approve - Admin approves request -> engine picks next best member excluding requester
router.post('/approve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can approve reassignment requests.' });
      return;
    }

    const { requestId } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'Request ID is required.' });
      return;
    }

    const request = await reassignmentRepo.findById(requestId);
    if (!request || request.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Reassignment request not found.' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ error: `Request already ${request.status}.` });
      return;
    }

    const task = await tasksRepo.findById(request.task_id);
    if (!task) {
      res.status(404).json({ error: 'Associated task no longer exists.' });
      return;
    }

    const familyId = task.family_id;
    const now = new Date().toISOString();

    // Run assignment engine excluding requester
    const [members, allTasks] = await Promise.all([
      membersRepo.findByFamilyId(familyId),
      tasksRepo.findByFamilyId(familyId)
    ]);

    const availabilities: Record<string, any> = {};
    const preferences: Record<string, any> = {};
    for (const m of members) {
      availabilities[m.id] = await availabilityRepo.findByMemberId(m.id);
      preferences[m.id] = await preferencesRepo.findByMemberId(m.id);
    }

    const engineResult = evaluateTaskAssignment({
      task,
      members,
      availabilities,
      preferences,
      allTasks,
      excludeMemberIds: [request.requesting_member_id]
    });

    const nextMember = engineResult.recommendedMember;

    if (nextMember) {
      await tasksRepo.update(task.id, {
        assigned_to_member_id: nextMember.id,
        status: 'Assigned',
        assigned_reason: engineResult.reason
      });

      await assignmentsRepo.create({
        id: `asg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        task_id: task.id,
        member_id: nextMember.id,
        status: 'Offered',
        suggested_reason_sentence: engineResult.reason,
        created_at: now
      });

      await notificationsRepo.create({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        family_id: familyId,
        member_id: nextMember.id,
        type: 'task_assigned',
        title: `Task Assigned: ${task.title}`,
        message: engineResult.reason,
        link: `/tasks?id=${task.id}`,
        read: false,
        created_at: now
      });
    } else {
      await tasksRepo.update(task.id, {
        assigned_to_member_id: null,
        status: 'Pending',
        assigned_reason: 'Reassigned by admin; no eligible members currently available.'
      });
    }

    // Update request record
    await reassignmentRepo.update(request.id, {
      status: 'approved',
      reviewed_at: now
    });

    // Notify requester
    await notificationsRepo.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      member_id: request.requesting_member_id,
      type: 'task_reassigned',
      title: `Reassignment Approved: ${task.title}`,
      message: nextMember
        ? `Your request was approved. Task reassigned to ${nextMember.name}.`
        : `Your request was approved. Task is now in Pending queue.`,
      link: `/tasks?id=${task.id}`,
      read: false,
      created_at: now
    });

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Reassignment Approved',
      details: nextMember
        ? `Approved reassignment of "${task.title}" to ${nextMember.name}`
        : `Approved reassignment of "${task.title}". Task is now Pending.`,
      created_at: now
    });

    eventBus.broadcast(familyId, 'task_reassigned', {
      requestId: request.id,
      taskId: task.id,
      nextMemberName: nextMember?.name || null
    });

    res.json({
      success: true,
      nextMember: nextMember ? { id: nextMember.id, name: nextMember.name } : null,
      message: nextMember
        ? `Reassignment approved. Task assigned to ${nextMember.name}.`
        : 'Reassignment approved. Task moved to Pending queue.'
    });
  } catch (err: any) {
    console.error('Error approving reassignment:', err);
    res.status(500).json({ error: 'Failed to approve reassignment.' });
  }
});

// POST /api/reassign/decline - Admin declines reassignment request
router.post('/decline', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can decline reassignment requests.' });
      return;
    }

    const { requestId, reason } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'Request ID is required.' });
      return;
    }

    const request = await reassignmentRepo.findById(requestId);
    if (!request || request.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Reassignment request not found.' });
      return;
    }

    const task = await tasksRepo.findById(request.task_id);
    const now = new Date().toISOString();

    await reassignmentRepo.update(request.id, {
      status: 'declined',
      reviewed_at: now
    });

    // Notify requester
    await notificationsRepo.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: request.family_id,
      member_id: request.requesting_member_id,
      type: 'system',
      title: `Reassignment Declined: ${task?.title || 'Task'}`,
      message: reason ? `Admin note: ${reason}` : 'Admin declined the reassignment request. Task remains assigned to you.',
      link: `/tasks?id=${request.task_id}`,
      read: false,
      created_at: now
    });

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: request.family_id,
      actor_name: req.member!.name,
      action: 'Reassignment Declined',
      details: `Declined reassignment request for "${task?.title || 'Task'}"`,
      created_at: now
    });

    eventBus.broadcast(request.family_id, 'data_updated', { type: 'reassignment_declined', requestId: request.id });

    res.json({ success: true, message: 'Reassignment request declined.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to decline reassignment.' });
  }
});

export default router;
