import { tasksRepo } from '../repositories/tasksRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { assignmentsRepo } from '../repositories/assignmentsRepo.ts';
import { evaluateTaskAssignment } from './assignmentEngine.ts';
import { eventBus } from './eventBus.ts';
import { Member, Task } from '../types.ts';

export async function handleMemberStatusChange(
  memberId: string,
  newStatus: Member['status'],
  actorName: string
): Promise<{ reassignedCount: number; flaggedCount: number; pendingCount: number }> {
  const member = await membersRepo.findById(memberId);
  if (!member) return { reassignedCount: 0, flaggedCount: 0, pendingCount: 0 };

  const familyId = member.family_id;

  // Update member status
  await membersRepo.updateStatus(memberId, newStatus);

  // Broadcast member status event
  const eventType = newStatus === 'Available' ? 'member_available' : 'member_busy';
  eventBus.broadcast(familyId, eventType, {
    memberId,
    memberName: member.name,
    status: newStatus
  });

  await activityLogsRepo.create({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    family_id: familyId,
    actor_name: actorName || member.name,
    action: `Member Status Changed`,
    details: `${member.name} is now ${newStatus}`,
    created_at: new Date().toISOString()
  });

  // If status is still Available, no need to auto-reassign tasks
  if (newStatus === 'Available') {
    return { reassignedCount: 0, flaggedCount: 0, pendingCount: 0 };
  }

  // Find all active tasks assigned to this member
  const familyTasks = await tasksRepo.findByFamilyId(familyId);
  const affectedTasks = familyTasks.filter(t => t.assigned_to_member_id === memberId);

  const allMembers = await membersRepo.findByFamilyId(familyId);
  const availabilities: Record<string, any> = {};
  const preferences: Record<string, any> = {};

  for (const m of allMembers) {
    availabilities[m.id] = await availabilityRepo.findByMemberId(m.id);
    preferences[m.id] = await preferencesRepo.findByMemberId(m.id);
  }

  let reassignedCount = 0;
  let flaggedCount = 0;
  let pendingCount = 0;

  for (const task of affectedTasks) {
    // Tasks already In Progress are flagged for the admin instead of moved
    if (task.status === 'In Progress') {
      await tasksRepo.update(task.id, {
        flagged_for_admin: true,
        flag_reason: `Assigned member (${member.name}) switched to ${newStatus} while task was In Progress.`
      });
      flaggedCount++;

      // Admin notification
      await notificationsRepo.create({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        family_id: familyId,
        member_id: null,
        type: 'member_unavailable',
        title: `Task flagged: In Progress task member became ${newStatus}`,
        message: `"${task.title}" is currently In Progress but ${member.name} is now ${newStatus}. Requires admin review.`,
        link: `/tasks?id=${task.id}`,
        read: false,
        created_at: new Date().toISOString()
      });

      continue;
    }

    // Tasks that are Assigned or Accepted must be auto-reassigned
    if (task.status === 'Assigned' || task.status === 'Accepted') {
      // Exclude the current member who became busy/away/offline
      const engineResult = evaluateTaskAssignment({
        task,
        members: allMembers,
        availabilities,
        preferences,
        allTasks: familyTasks,
        excludeMemberIds: [memberId]
      });

      if (engineResult.recommendedMemberId && engineResult.recommendedMember) {
        const nextMember = engineResult.recommendedMember;

        // Assign to new member
        await tasksRepo.update(task.id, {
          assigned_to_member_id: nextMember.id,
          status: 'Assigned',
          assigned_reason: engineResult.reason,
          flagged_for_admin: false,
          flag_reason: undefined
        });

        await assignmentsRepo.create({
          id: `asg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          task_id: task.id,
          member_id: nextMember.id,
          status: 'Offered',
          suggested_reason_sentence: engineResult.reason,
          created_at: new Date().toISOString()
        });

        // Notify new member
        await notificationsRepo.create({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          family_id: familyId,
          member_id: nextMember.id,
          type: 'task_assigned',
          title: `New Task Assigned: ${task.title}`,
          message: `Auto-reassigned from ${member.name} (${newStatus}). ${engineResult.reason}`,
          link: `/tasks?id=${task.id}`,
          read: false,
          created_at: new Date().toISOString()
        });

        // Log it
        await activityLogsRepo.create({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          family_id: familyId,
          actor_name: 'Auto-Assignment Engine',
          action: 'Task Reassigned Automatically',
          details: `Reassigned "${task.title}" from ${member.name} to ${nextMember.name}`,
          created_at: new Date().toISOString()
        });

        reassignedCount++;
      } else {
        // Tasks nobody can take stay Pending and trigger an admin alert
        await tasksRepo.update(task.id, {
          assigned_to_member_id: null,
          status: 'Pending',
          assigned_reason: engineResult.reason,
          flagged_for_admin: true,
          flag_reason: `Unassigned because ${member.name} became ${newStatus} and no eligible members are available.`
        });

        await notificationsRepo.create({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          family_id: familyId,
          member_id: null,
          type: 'member_unavailable',
          title: `Unassigned Task Alert: ${task.title}`,
          message: `${member.name} became ${newStatus}. No eligible member could take "${task.title}". Task is now Pending.`,
          link: `/tasks?id=${task.id}`,
          read: false,
          created_at: new Date().toISOString()
        });

        pendingCount++;
      }
    }
  }

  // Push live update
  eventBus.broadcast(familyId, 'task_reassigned', {
    memberId,
    newStatus,
    reassignedCount,
    flaggedCount,
    pendingCount
  });

  return { reassignedCount, flaggedCount, pendingCount };
}
