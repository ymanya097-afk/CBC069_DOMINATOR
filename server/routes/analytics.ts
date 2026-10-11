import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';

const router = Router();

// GET /api/analytics
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const [tasks, members] = await Promise.all([
      tasksRepo.findByFamilyId(familyId),
      membersRepo.findByFamilyId(familyId)
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'Assigned');
    const inProgressTasks = tasks.filter(t => t.status === 'Accepted' || t.status === 'In Progress');
    const overdueTasks = tasks.filter(t => t.status === 'Overdue');

    // Average completion time (hours)
    let totalCompletionHours = 0;
    let completedWithDatesCount = 0;
    for (const t of completedTasks) {
      if (t.completed_at && t.created_at) {
        const diffMs = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime();
        if (diffMs > 0) {
          totalCompletionHours += diffMs / (1000 * 60 * 60);
          completedWithDatesCount++;
        }
      }
    }
    const avgCompletionHours = completedWithDatesCount > 0
      ? Math.round((totalCompletionHours / completedWithDatesCount) * 10) / 10
      : 0;

    // Member activity & workload
    const memberStats = members.map(m => {
      const completedByMember = tasks.filter(t => t.assigned_to_member_id === m.id && t.status === 'Completed').length;
      const activeByMember = tasks.filter(
        t => t.assigned_to_member_id === m.id &&
        (t.status === 'Assigned' || t.status === 'Accepted' || t.status === 'In Progress')
      );
      const totalActiveMinutes = activeByMember.reduce((sum, t) => sum + (t.effort || 0), 0);

      return {
        memberId: m.id,
        name: m.name,
        role: m.role,
        status: m.status,
        completedCount: completedByMember,
        activeCount: activeByMember.length,
        workloadMinutes: totalActiveMinutes,
        workloadHours: Math.round((totalActiveMinutes / 60) * 10) / 10
      };
    });

    // Most active member (most completed tasks)
    const sortedByCompleted = [...memberStats].sort((a, b) => b.completedCount - a.completedCount);
    const mostActiveMember = sortedByCompleted[0] || null;

    // Least busy member (lowest active workload among members)
    const sortedByWorkload = [...memberStats].sort((a, b) => a.workloadMinutes - b.workloadMinutes);
    const leastBusyMember = sortedByWorkload[0] || null;

    // Category breakdown
    const categories = ['Cleaning', 'Cooking', 'Shopping', 'Bills', 'Maintenance', 'Laundry', 'Gardening'];
    const categoryBreakdown = categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      return {
        category: cat,
        total: catTasks.length,
        completed: catTasks.filter(t => t.status === 'Completed').length,
        pending: catTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length
      };
    });

    // Priority breakdown
    const priorityBreakdown = ['Critical', 'High', 'Medium', 'Low'].map(p => ({
      priority: p,
      count: tasks.filter(t => t.priority === p).length,
      completed: tasks.filter(t => t.priority === p && t.status === 'Completed').length
    }));

    res.json({
      figures: {
        totalTasks,
        completedCount: completedTasks.length,
        pendingCount: pendingTasks.length,
        inProgressCount: inProgressTasks.length,
        overdueCount: overdueTasks.length,
        avgCompletionHours,
        mostActiveMember: mostActiveMember ? { name: mostActiveMember.name, completed: mostActiveMember.completedCount } : null,
        leastBusyMember: leastBusyMember ? { name: leastBusyMember.name, hours: leastBusyMember.workloadHours } : null
      },
      workloadDistribution: memberStats,
      categoryBreakdown,
      priorityBreakdown
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

export default router;
