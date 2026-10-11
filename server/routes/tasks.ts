import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { resourcesRepo } from '../repositories/resourcesRepo.ts';
import { assignmentsRepo } from '../repositories/assignmentsRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { evaluateTaskAssignment } from '../services/assignmentEngine.ts';
import { eventBus } from '../services/eventBus.ts';
import { Task, TaskCategory, TaskPriority, TaskRecurring, TaskStatus } from '../types.ts';
import { supabasePublic } from '../lib/supabase.ts';

const router = Router();

// GET /api/tasks - List, filter, sort, search tasks
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    let tasks = await tasksRepo.findByFamilyId(familyId);
    const members = await membersRepo.findByFamilyId(familyId);
    const resources = await resourcesRepo.findByFamilyId(familyId);

    const memberMap = new Map(members.map(m => [m.id, m]));
    const resourceMap = new Map(resources.map(r => [r.id, r]));

    const { category, priority, status, assignedTo, search, sortBy, sortOrder } = req.query;

    if (category && typeof category === 'string') {
      tasks = tasks.filter(t => t.category === category);
    }

    if (priority && typeof priority === 'string') {
      tasks = tasks.filter(t => t.priority === priority);
    }

    if (status && typeof status === 'string') {
      tasks = tasks.filter(t => t.status === status);
    }

    if (assignedTo && typeof assignedTo === 'string') {
      if (assignedTo === 'unassigned') {
        tasks = tasks.filter(t => !t.assigned_to_member_id);
      } else {
        tasks = tasks.filter(t => t.assigned_to_member_id === assignedTo);
      }
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.room && t.room.toLowerCase().includes(q))
      );
    }

    // Sort
    const order = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'deadline') {
      tasks.sort((a, b) => (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * order);
    } else if (sortBy === 'priority') {
      const rank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      tasks.sort((a, b) => ((rank[b.priority] || 0) - (rank[a.priority] || 0)) * order);
    } else if (sortBy === 'effort') {
      tasks.sort((a, b) => (a.effort - b.effort) * order);
    } else {
      // Default created_at desc
      tasks.sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }

    const enriched = tasks.map(t => ({
      ...t,
      assignedMember: t.assigned_to_member_id ? memberMap.get(t.assigned_to_member_id) || null : null,
      resource: t.resource_id ? resourceMap.get(t.resource_id) || null : null
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/:id/recommend - Get smart assignment recommendations (never reveals scores/weights)
router.get('/:id/recommend', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await tasksRepo.findById(req.params.id);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const familyId = task.family_id;
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
      allTasks
    });

    // Strip internal _score from response to honor prompt rule:
    // "IMPORTANT: never show scores, weights or the formula anywhere in the UI or in API responses."
    const safeCandidates = engineResult.allCandidates.map(c => ({
      memberId: c.memberId,
      name: c.member.name,
      status: c.member.status,
      humanReason: c.humanReason,
      isEligible: c.isEligible,
      ineligibilityReason: c.ineligibilityReason
    }));

    res.json({
      recommendedMemberId: engineResult.recommendedMemberId,
      recommendedMemberName: engineResult.recommendedMember?.name || null,
      reasonSentence: engineResult.reason,
      candidates: safeCandidates,
      hint: engineResult.hint
    });
  } catch (err: any) {
    console.error('Error in recommendation:', err);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

// POST /api/tasks - Create task
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      effort,
      deadline,
      room,
      resource_id,
      recurring,
      autoAssign,
      assigned_to_member_id
    } = req.body;

    if (!title || !category || !priority || !deadline) {
      res.status(400).json({ error: 'Title, category, priority, and deadline are required.' });
      return;
    }

    const familyId = req.member!.family_id;
    const client = req.supabase || supabasePublic!;
    const now = new Date().toISOString();
    const taskId = `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let targetMemberId = assigned_to_member_id || null;
    let initialStatus: TaskStatus = targetMemberId ? 'Assigned' : 'Pending';
    let assignedReason: string | undefined = undefined;

    const newTask: Task = {
      id: taskId,
      family_id: familyId,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category as TaskCategory,
      priority: priority as TaskPriority,
      effort: Number(effort) || 30,
      deadline,
      room: room ? room.trim() : 'General',
      resource_id: resource_id || null,
      recurring: (recurring as TaskRecurring) || 'None',
      status: initialStatus,
      assigned_to_member_id: targetMemberId,
      assigned_reason: assignedReason,
      created_at: now
    };

    // If autoAssign was requested or if no member was manually picked, run assignment engine
    if (autoAssign || !targetMemberId) {
      const [members, allTasks] = await Promise.all([
        membersRepo.findByFamilyId(familyId, client),
        tasksRepo.findByFamilyId(familyId, client)
      ]);

      const availabilities: Record<string, any> = {};
      const preferences: Record<string, any> = {};
      for (const m of members) {
        availabilities[m.id] = await availabilityRepo.findByMemberId(m.id, client);
        preferences[m.id] = await preferencesRepo.findByMemberId(m.id, client);
      }

      const engineResult = evaluateTaskAssignment({
        task: newTask,
        members,
        availabilities,
        preferences,
        allTasks
      });

      if (engineResult.recommendedMemberId) {
        newTask.assigned_to_member_id = engineResult.recommendedMemberId;
        newTask.status = 'Assigned';
        newTask.assigned_reason = engineResult.reason;
      } else {
        newTask.status = 'Pending';
        newTask.assigned_reason = engineResult.hint || 'No eligible members found';
      }
    }

    const createdTask = await tasksRepo.create(newTask, client);

    // If assigned, create assignment record and notification
    if (createdTask.assigned_to_member_id) {
      await assignmentsRepo.create({
        task_id: createdTask.id,
        member_id: createdTask.assigned_to_member_id,
        status: 'Offered',
        suggested_reason_sentence: createdTask.assigned_reason,
        created_at: now
      }, client);

      await notificationsRepo.create({
        family_id: familyId,
        member_id: createdTask.assigned_to_member_id,
        type: 'task_assigned',
        title: `Task Assigned: ${createdTask.title}`,
        message: createdTask.assigned_reason || `You have been assigned "${createdTask.title}". Please accept or reject this task.`,
        link: `/tasks?id=${createdTask.id}`,
        read: false,
        created_at: now
      }, client);
    }

    await activityLogsRepo.create({
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Task Created',
      details: `Created task "${createdTask.title}" (${createdTask.priority})`,
      created_at: now
    }, client);

    eventBus.broadcast(familyId, 'task_assigned', {
      task: createdTask,
      actorName: req.member!.name
    });

    res.status(201).json(createdTask);
  } catch (err: any) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id - Edit task
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = req.supabase || supabasePublic!;
    const task = await tasksRepo.findById(req.params.id, client);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const {
      title,
      description,
      category,
      priority,
      effort,
      deadline,
      room,
      resource_id,
      recurring,
      status,
      assigned_to_member_id
    } = req.body;

    const updates: Partial<Task> = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category) updates.category = category;
    if (priority) updates.priority = priority;
    if (effort !== undefined) updates.effort = Number(effort);
    if (deadline) updates.deadline = deadline;
    if (room !== undefined) updates.room = room;
    if (resource_id !== undefined) updates.resource_id = resource_id || null;
    if (recurring) updates.recurring = recurring;
    if (status) updates.status = status;

    const isNewlyAssigned = assigned_to_member_id && assigned_to_member_id !== task.assigned_to_member_id;

    if (assigned_to_member_id !== undefined && assigned_to_member_id !== task.assigned_to_member_id) {
      updates.assigned_to_member_id = assigned_to_member_id || null;
      if (assigned_to_member_id) {
        updates.status = 'Assigned';
        updates.assigned_reason = 'Assigned by administrator';
      }
    }

    const updatedTask = await tasksRepo.update(task.id, updates, client);

    if (isNewlyAssigned && updates.assigned_to_member_id) {
      await assignmentsRepo.create({
        task_id: task.id,
        member_id: updates.assigned_to_member_id,
        status: 'Offered',
        suggested_reason_sentence: 'Assigned to you'
      }, client);

      await notificationsRepo.create({
        family_id: task.family_id,
        member_id: updates.assigned_to_member_id,
        type: 'task_assigned',
        title: `Task Assigned: ${updatedTask?.title || task.title}`,
        message: `You have been assigned "${updatedTask?.title || task.title}". Please accept or reject this task.`,
        link: `/tasks?id=${task.id}`,
        read: false
      }, client);
    }

    await activityLogsRepo.create({
      family_id: task.family_id,
      actor_name: req.member!.name,
      action: 'Task Updated',
      details: `Updated task "${updatedTask?.title}"`,
      created_at: new Date().toISOString()
    }, client);

    eventBus.broadcast(task.family_id, 'data_updated', { type: 'task', id: task.id });

    res.json(updatedTask);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await tasksRepo.findById(req.params.id);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    // Only admin or task creator
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Admin privileges required to delete tasks.' });
      return;
    }

    await tasksRepo.delete(task.id);

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: task.family_id,
      actor_name: req.member!.name,
      action: 'Task Deleted',
      details: `Deleted task "${task.title}"`,
      created_at: new Date().toISOString()
    });

    eventBus.broadcast(task.family_id, 'data_updated', { type: 'task_deleted', id: task.id });

    res.json({ success: true, message: `Task "${task.title}" removed.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// POST /api/assign - Run smart assignment or assign manually
router.post('/assign', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, memberId } = req.body;
    const client = req.supabase || supabasePublic!;

    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required.' });
      return;
    }

    const task = await tasksRepo.findById(taskId, client);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const familyId = task.family_id;
    const members = await membersRepo.findByFamilyId(familyId, client);
    let chosenMemberId = memberId;
    let reasonSentence = 'Assigned by family administrator.';

    if (!chosenMemberId) {
      // Run assignment engine
      const allTasks = await tasksRepo.findByFamilyId(familyId, client);
      const availabilities: Record<string, any> = {};
      const preferences: Record<string, any> = {};
      for (const m of members) {
        availabilities[m.id] = await availabilityRepo.findByMemberId(m.id, client);
        preferences[m.id] = await preferencesRepo.findByMemberId(m.id, client);
      }

      const result = evaluateTaskAssignment({
        task,
        members,
        availabilities,
        preferences,
        allTasks
      });

      if (!result.recommendedMemberId) {
        res.status(400).json({
          error: 'No eligible members available to assign this task.',
          hint: result.hint
        });
        return;
      }

      chosenMemberId = result.recommendedMemberId;
      reasonSentence = result.reason;
    }

    const assignedMember = members.find(m => m.id === chosenMemberId);
    if (!assignedMember) {
      res.status(404).json({ error: 'Selected member not found.' });
      return;
    }

    const updatedTask = await tasksRepo.update(task.id, {
      assigned_to_member_id: chosenMemberId,
      status: 'Assigned',
      assigned_reason: reasonSentence,
      flagged_for_admin: false,
      flag_reason: undefined
    }, client);

    const now = new Date().toISOString();
    await assignmentsRepo.create({
      task_id: task.id,
      member_id: chosenMemberId,
      status: 'Offered',
      suggested_reason_sentence: reasonSentence,
      created_at: now
    }, client);

    await notificationsRepo.create({
      family_id: familyId,
      member_id: chosenMemberId,
      type: 'task_assigned',
      title: `Task Assigned: ${task.title}`,
      message: reasonSentence || `You have been assigned "${task.title}". Please accept or reject this task.`,
      link: `/tasks?id=${task.id}`,
      read: false,
      created_at: now
    }, client);

    await activityLogsRepo.create({
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Task Assigned',
      details: `Assigned "${task.title}" to ${assignedMember.name}`,
      created_at: now
    }, client);

    eventBus.broadcast(familyId, 'task_assigned', {
      taskId: task.id,
      memberId: chosenMemberId,
      memberName: assignedMember.name,
      reasonSentence
    });

    res.json({
      task: updatedTask,
      assignedMember,
      reasonSentence
    });
  } catch (err: any) {
    console.error('Error assigning task:', err);
    res.status(500).json({ error: 'Failed to assign task.' });
  }
});

// POST /api/accept - Member accepts assigned task
router.post('/accept', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.body;
    const client = req.supabase || supabasePublic!;

    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required.' });
      return;
    }

    const task = await tasksRepo.findById(taskId, client);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (task.assigned_to_member_id !== req.member!.id && req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only the assigned member or an admin can accept this task.' });
      return;
    }

    const updatedTask = await tasksRepo.update(task.id, {
      status: 'Accepted'
    }, client);

    // Update assignment record if exists
    try {
      const assignments = await assignmentsRepo.findByTaskId(task.id, client);
      const currentAsg = assignments.find(a => a.member_id === req.member!.id);
      if (currentAsg) {
        await assignmentsRepo.update(currentAsg.id, { status: 'Accepted' }, client);
      }
    } catch {
      // assignment status update fallback
    }

    const now = new Date().toISOString();
    await activityLogsRepo.create({
      family_id: task.family_id,
      actor_name: req.member!.name,
      action: 'Task Accepted',
      details: `${req.member!.name} accepted task "${task.title}"`,
      created_at: now
    }, client);

    // Notify admins / family
    await notificationsRepo.create({
      family_id: task.family_id,
      member_id: null,
      type: 'task_accepted',
      title: `Task Accepted: ${task.title}`,
      message: `${req.member!.name} accepted the task assignment.`,
      link: `/tasks?id=${task.id}`,
      read: false,
      created_at: now
    }, client);

    eventBus.broadcast(task.family_id, 'task_accepted', {
      taskId: task.id,
      memberId: req.member!.id,
      memberName: req.member!.name
    });

    res.json({ task: updatedTask, message: 'Task accepted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to accept task.' });
  }
});

// POST /api/reject - Member rejects task with reason (>= 5 chars required)
// Then offered to next best member via engine
router.post('/reject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, reason } = req.body;
    const client = req.supabase || supabasePublic!;

    if (!taskId || !reason) {
      res.status(400).json({ error: 'Task ID and rejection reason are required.' });
      return;
    }

    if (typeof reason !== 'string' || reason.trim().length < 5) {
      res.status(400).json({ error: 'Rejection reason must be at least 5 characters long.' });
      return;
    }

    const task = await tasksRepo.findById(taskId, client);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const currentMemberId = req.member!.id;
    const currentMemberName = req.member!.name;
    const familyId = task.family_id;
    const now = new Date().toISOString();

    // Log the rejection
    await activityLogsRepo.create({
      family_id: familyId,
      actor_name: currentMemberName,
      action: 'Task Rejected',
      details: `${currentMemberName} declined "${task.title}". Reason: "${reason.trim()}"`
    }, client);

    // Run engine excluding rejecting member
    const [members, allTasks] = await Promise.all([
      membersRepo.findByFamilyId(familyId, client),
      tasksRepo.findByFamilyId(familyId, client)
    ]);

    const availabilities: Record<string, any> = {};
    const preferences: Record<string, any> = {};
    for (const m of members) {
      availabilities[m.id] = await availabilityRepo.findByMemberId(m.id, client);
      preferences[m.id] = await preferencesRepo.findByMemberId(m.id, client);
    }

    const engineResult = evaluateTaskAssignment({
      task,
      members,
      availabilities,
      preferences,
      allTasks,
      excludeMemberIds: [currentMemberId]
    });

    let updatedTask: Task | null = null;
    let nextMember = engineResult.recommendedMember;
    const adminMember = members.find(m => m.role === 'admin');

    if (nextMember) {
      // Offer to next best member
      updatedTask = await tasksRepo.update(task.id, {
        assigned_to_member_id: nextMember.id,
        status: 'Assigned',
        assigned_reason: engineResult.reason
      }, client);

      await assignmentsRepo.create({
        task_id: task.id,
        member_id: nextMember.id,
        status: 'Offered',
        reason: `Re-offered after rejection by ${currentMemberName}`,
        suggested_reason_sentence: engineResult.reason
      }, client);

      await notificationsRepo.create({
        family_id: familyId,
        member_id: nextMember.id,
        type: 'task_assigned',
        title: `Task Assigned: ${task.title}`,
        message: engineResult.reason,
        link: `/tasks?id=${task.id}`,
        read: false
      }, client);

      // Notify admin of rejection and successful reoffer
      await notificationsRepo.create({
        family_id: familyId,
        member_id: adminMember ? adminMember.id : null,
        type: 'task_reassigned',
        title: `Task Rejected: ${task.title}`,
        message: `${currentMemberName} declined: "${reason.trim()}". Re-assigned to ${nextMember.name}.`,
        link: `/tasks?id=${task.id}`,
        read: false
      }, client);
    } else {
      // No one else eligible
      updatedTask = await tasksRepo.update(task.id, {
        assigned_to_member_id: null,
        status: 'Pending',
        assigned_reason: `Rejected by ${currentMemberName} ("${reason.trim()}"). No other eligible members found.`
      }, client);

      await notificationsRepo.create({
        family_id: familyId,
        member_id: adminMember ? adminMember.id : null,
        type: 'task_reassigned',
        title: `Unassigned Task: ${task.title}`,
        message: `${currentMemberName} rejected "${task.title}". No other members currently available.`,
        link: `/tasks?id=${task.id}`,
        read: false
      }, client);
    }

    eventBus.broadcast(familyId, 'task_reassigned', {
      taskId: task.id,
      rejectedBy: currentMemberName,
      nextMemberName: nextMember?.name || null
    });

    res.json({
      task: updatedTask || task,
      nextMember: nextMember ? { id: nextMember.id, name: nextMember.name } : null,
      message: nextMember
        ? `Task reassigned to ${nextMember.name}.`
        : 'Task moved back to Pending queue as no other members are currently available.'
    });
  } catch (err: any) {
    console.error('Error in task rejection:', err);
    res.status(500).json({ error: err?.message || 'Failed to reject task.' });
  }
});

// POST /api/complete - Mark task complete; recurring tasks spawn next occurrence automatically
router.post('/complete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required.' });
      return;
    }

    const task = await tasksRepo.findById(taskId);
    if (!task || task.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const updatedTask = await tasksRepo.update(task.id, {
      status: 'Completed',
      completed_at: nowIso
    });

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: task.family_id,
      actor_name: req.member!.name,
      action: 'Task Completed',
      details: `${req.member!.name} completed "${task.title}"`,
      created_at: nowIso
    });

    await notificationsRepo.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: task.family_id,
      member_id: null,
      type: 'task_completed',
      title: `Task Completed: ${task.title}`,
      message: `${req.member!.name} marked "${task.title}" as completed.`,
      link: `/tasks?id=${task.id}`,
      read: false,
      created_at: nowIso
    });

    // Handle recurring task: when recurring task is completed, create next occurrence automatically!
    let nextTask: Task | null = null;
    if (task.recurring && task.recurring !== 'None') {
      const prevDeadline = new Date(task.deadline);
      const nextDeadline = new Date(prevDeadline);

      if (task.recurring === 'Daily') {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      } else if (task.recurring === 'Weekly') {
        nextDeadline.setDate(nextDeadline.getDate() + 7);
      } else if (task.recurring === 'Monthly') {
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      }

      const nextTaskId = `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const recurringTaskPayload: Task = {
        id: nextTaskId,
        family_id: task.family_id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        effort: task.effort,
        deadline: nextDeadline.toISOString(),
        room: task.room,
        resource_id: task.resource_id,
        recurring: task.recurring,
        status: 'Assigned',
        assigned_to_member_id: task.assigned_to_member_id,
        assigned_reason: `Recurring occurrence (${task.recurring}) from previous completion.`,
        parent_task_id: task.id,
        created_at: nowIso
      };

      nextTask = await tasksRepo.create(recurringTaskPayload);

      await activityLogsRepo.create({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        family_id: task.family_id,
        actor_name: 'Automation',
        action: 'Recurring Task Scheduled',
        details: `Created next occurrence of "${task.title}" due ${nextDeadline.toLocaleDateString()}`,
        created_at: nowIso
      });
    }

    eventBus.broadcast(task.family_id, 'task_completed', {
      taskId: task.id,
      completedBy: req.member!.name,
      nextRecurringTask: nextTask
    });

    res.json({
      task: updatedTask,
      nextRecurringTask: nextTask,
      message: nextTask
        ? `Task completed! Next recurring occurrence scheduled for ${new Date(nextTask.deadline).toLocaleDateString()}.`
        : 'Task marked as completed.'
    });
  } catch (err: any) {
    console.error('Error completing task:', err);
    res.status(500).json({ error: 'Failed to complete task.' });
  }
});

export default router;
