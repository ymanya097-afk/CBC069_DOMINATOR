import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { resourcesRepo } from '../repositories/resourcesRepo.ts';

const router = Router();

export interface CalendarItem {
  id: string;
  title: string;
  itemType: 'task' | 'recurring_projection' | 'bill';
  date: string; // YYYY-MM-DD
  time?: string;
  category?: string;
  priority?: string;
  status?: string;
  amount?: number | null;
  assignedMemberName?: string;
  taskId?: string;
}

// GET /api/calendar - Calendar items for month
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const now = new Date();
    const queryYear = parseInt(req.query.year as string, 10) || now.getFullYear();
    const queryMonth = parseInt(req.query.month as string, 10) || now.getMonth() + 1; // 1-12

    const [tasks, members, resources] = await Promise.all([
      tasksRepo.findByFamilyId(familyId),
      membersRepo.findByFamilyId(familyId),
      resourcesRepo.findByFamilyId(familyId)
    ]);

    const memberMap = new Map(members.map(m => [m.id, m]));
    const items: CalendarItem[] = [];

    // 1. Regular active or completed tasks
    for (const t of tasks) {
      const d = new Date(t.deadline);
      const dateStr = d.toISOString().slice(0, 10);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      items.push({
        id: `cal-t-${t.id}`,
        taskId: t.id,
        title: t.title,
        itemType: 'task',
        date: dateStr,
        time: timeStr,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedMemberName: t.assigned_to_member_id ? memberMap.get(t.assigned_to_member_id)?.name || 'Unassigned' : 'Unassigned'
      });

      // 2. Project recurring tasks into future dates of the month
      if (t.recurring && t.recurring !== 'None') {
        const startDate = new Date(t.deadline);
        const monthStart = new Date(queryYear, queryMonth - 1, 1);
        const monthEnd = new Date(queryYear, queryMonth, 0);

        let curr = new Date(startDate);
        // Step forward up to monthEnd
        let safety = 0;
        while (curr <= monthEnd && safety < 60) {
          safety++;
          if (t.recurring === 'Daily') {
            curr.setDate(curr.getDate() + 1);
          } else if (t.recurring === 'Weekly') {
            curr.setDate(curr.getDate() + 7);
          } else if (t.recurring === 'Monthly') {
            curr.setMonth(curr.getMonth() + 1);
          }

          if (curr >= monthStart && curr <= monthEnd) {
            const projDateStr = curr.toISOString().slice(0, 10);
            // Don't add duplicate if original task is already on that exact date
            if (projDateStr !== dateStr) {
              items.push({
                id: `cal-proj-${t.id}-${safety}`,
                taskId: t.id,
                title: `${t.title} (Recurring)`,
                itemType: 'recurring_projection',
                date: projDateStr,
                time: timeStr,
                category: t.category,
                priority: t.priority,
                status: 'Projected',
                assignedMemberName: t.assigned_to_member_id ? memberMap.get(t.assigned_to_member_id)?.name || 'Unassigned' : 'Unassigned'
              });
            }
          }
        }
      }
    }

    // 3. Bills with due date
    for (const r of resources) {
      if (r.type === 'bills' && r.due_date) {
        items.push({
          id: `cal-b-${r.id}`,
          title: `Bill Due: ${r.name}`,
          itemType: 'bill',
          date: r.due_date.slice(0, 10),
          category: 'Bills',
          priority: 'High',
          status: 'Due',
          amount: r.amount
        });
      }
    }

    res.json({
      year: queryYear,
      month: queryMonth,
      items
    });
  } catch (err: any) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar items.' });
  }
});

export default router;
