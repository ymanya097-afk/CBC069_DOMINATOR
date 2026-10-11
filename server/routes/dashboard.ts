import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;

    const [members, tasks, activityLogs] = await Promise.all([
      membersRepo.findByFamilyId(familyId),
      tasksRepo.findByFamilyId(familyId),
      activityLogsRepo.findByFamilyId(familyId, 20)
    ]);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Cards
    const totalMembers = members.length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'Assigned').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    
    const todaysTasks = tasks.filter(t => {
      const taskDate = t.deadline.slice(0, 10);
      return taskDate === todayStr && t.status !== 'Completed' && t.status !== 'Cancelled';
    }).length;

    // Charts: Task Completion (by Category)
    const categories = ['Cleaning', 'Cooking', 'Shopping', 'Bills', 'Maintenance', 'Laundry', 'Gardening'];
    const taskCompletionByCategory = categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      return {
        category: cat,
        completed: catTasks.filter(t => t.status === 'Completed').length,
        pending: catTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length
      };
    }).filter(item => item.completed > 0 || item.pending > 0);

    // Charts: Workload Distribution across members
    const memberMap = new Map(members.map(m => [m.id, m]));
    const workloadDistribution = members.map(m => {
      const assigned = tasks.filter(
        t => t.assigned_to_member_id === m.id &&
        (t.status === 'Assigned' || t.status === 'Accepted' || t.status === 'In Progress')
      );
      const totalMinutes = assigned.reduce((sum, t) => sum + (t.effort || 0), 0);
      return {
        memberId: m.id,
        name: m.name,
        status: m.status,
        taskCount: assigned.length,
        effortMinutes: totalMinutes,
        effortHours: Math.round((totalMinutes / 60) * 10) / 10
      };
    });

    // Charts: Weekly Performance (Completed tasks in last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyPerformance = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = dayNames[d.getDay()];

      const completedCount = tasks.filter(t => {
        if (t.status !== 'Completed' || !t.completed_at) return false;
        return t.completed_at.slice(0, 10) === dateKey;
      }).length;

      const createdCount = tasks.filter(t => {
        return t.created_at.slice(0, 10) === dateKey;
      }).length;

      weeklyPerformance.push({
        date: dateKey,
        day: dayLabel,
        completed: completedCount,
        created: createdCount
      });
    }

    // Upcoming Deadlines (Active tasks, sorted by earliest deadline)
    const upcomingDeadlines = tasks
      .filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6)
      .map(t => ({
        ...t,
        assignedMemberName: t.assigned_to_member_id ? memberMap.get(t.assigned_to_member_id)?.name || 'Unknown' : 'Unassigned'
      }));

    res.json({
      cards: {
        totalMembers,
        pendingTasks,
        completedTasks,
        overdueTasks,
        todaysTasks
      },
      charts: {
        taskCompletionByCategory,
        workloadDistribution,
        weeklyPerformance
      },
      upcomingDeadlines,
      activityFeed: activityLogs
    });
  } catch (err: any) {
    console.error('Error in /api/dashboard:', err);
    res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

export default router;
