import { supabasePublic } from '../lib/supabase.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { eventBus } from './eventBus.ts';

let intervalTimer: NodeJS.Timeout | null = null;

export function startBackgroundJobs(): void {
  if (intervalTimer) return;

  // Run initial check quietly, then every 60 seconds
  checkOverdueAndReminders().catch(() => {});

  intervalTimer = setInterval(() => {
    checkOverdueAndReminders().catch(() => {});
  }, 60 * 1000);
}

export function stopBackgroundJobs(): void {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

export async function checkOverdueAndReminders(): Promise<void> {
  const sb = supabasePublic;
  if (!sb) return;

  // 1. Try PostgreSQL security-definer RPC if available (bypasses RLS atomically)
  try {
    const { data: rpcData, error: rpcErr } = await sb.rpc('system_check_overdue_and_reminders');
    if (!rpcErr && rpcData?.success) {
      return;
    }
  } catch {
    // Continue to JS loop fallback
  }

  // 2. JavaScript fallback loop with per-task safety
  try {
    const allTasks = await tasksRepo.getAll(sb);
    if (!allTasks || allTasks.length === 0) return;

    const now = new Date();
    const nowMs = now.getTime();

    for (const task of allTasks) {
      try {
        if (task.status === 'Completed' || task.status === 'Cancelled') {
          continue;
        }

        const deadline = new Date(task.deadline);
        const deadlineMs = deadline.getTime();
        const diffMs = deadlineMs - nowMs;

        // Check overdue
        if (diffMs < 0 && task.status !== 'Overdue') {
          await tasksRepo.update(task.id, { status: 'Overdue' }, sb);

          await notificationsRepo.create({
            family_id: task.family_id,
            member_id: task.assigned_to_member_id || null,
            type: 'overdue',
            title: `Task Overdue: ${task.title}`,
            message: `Task "${task.title}" missed its deadline on ${deadline.toLocaleDateString()}.`,
            link: `/tasks?id=${task.id}`,
            read: false
          }, sb);

          await activityLogsRepo.create({
            family_id: task.family_id,
            actor_name: 'System',
            action: 'Task Marked Overdue',
            details: `"${task.title}" passed deadline without completion.`
          }, sb);

          eventBus.broadcast(task.family_id, 'overdue_alert', {
            taskId: task.id,
            title: task.title,
            deadline: task.deadline
          });
          continue;
        }

        // Check 24-hour reminder
        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000 && !task.reminded_24h) {
          await tasksRepo.update(task.id, { reminded_24h: true }, sb);

          await notificationsRepo.create({
            family_id: task.family_id,
            member_id: task.assigned_to_member_id || null,
            type: 'deadline_reminder',
            title: `24-Hour Reminder: ${task.title}`,
            message: `"${task.title}" is due tomorrow at ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            link: `/tasks?id=${task.id}`,
            read: false
          }, sb);
        }

        // Check 2-hour reminder
        if (diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000 && !task.reminded_2h) {
          await tasksRepo.update(task.id, { reminded_2h: true }, sb);

          await notificationsRepo.create({
            family_id: task.family_id,
            member_id: task.assigned_to_member_id || null,
            type: 'deadline_reminder',
            title: `Urgent Reminder: ${task.title} due in 2 hours`,
            message: `"${task.title}" is due soon (${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
            link: `/tasks?id=${task.id}`,
            read: false
          }, sb);
        }
      } catch {
        // Individual task failure does not break the cycle
      }
    }
  } catch {
    // Database table might not be initialized yet in new Supabase project
  }
}
