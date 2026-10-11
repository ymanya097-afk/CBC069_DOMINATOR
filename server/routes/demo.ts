import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { membersRepo } from '../repositories/membersRepo.ts';
import { usersRepo } from '../repositories/usersRepo.ts';
import { tasksRepo } from '../repositories/tasksRepo.ts';
import { resourcesRepo } from '../repositories/resourcesRepo.ts';
import { availabilityRepo } from '../repositories/availabilityRepo.ts';
import { preferencesRepo } from '../repositories/preferencesRepo.ts';
import { notificationsRepo } from '../repositories/notificationsRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { assignmentsRepo } from '../repositories/assignmentsRepo.ts';
import { reassignmentRepo } from '../repositories/reassignmentRepo.ts';
import { eventBus } from '../services/eventBus.ts';
import { AvailabilitySchedule, Member, Resource, Task, TaskCategory } from '../types.ts';

const router = Router();

// POST /api/demo/seed - Load realistic demo dataset
router.post('/seed', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can load demo data.' });
      return;
    }

    const familyId = req.member!.family_id;
    const currentAdmin = req.member!;
    const now = new Date();

    // 1. Ensure 5 distinct members with varied availability and status
    // Keep current admin as Member 1, add/update 4 other demo members
    const existingMembers = await membersRepo.findByFamilyId(familyId);
    
    // Create demo passwords
    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('DemoPass123!', salt);

    const demoProfiles = [
      {
        name: 'Alex Chen',
        email: `alex.${familyId.slice(-4)}@example.com`,
        role: 'member' as const,
        status: 'Available' as const,
        color: '#6a9bcc',
        slots: {
          Monday: { Morning: true, Afternoon: true, Evening: false, Night: false },
          Tuesday: { Morning: true, Afternoon: true, Evening: false, Night: false },
          Wednesday: { Morning: true, Afternoon: true, Evening: false, Night: false },
          Thursday: { Morning: true, Afternoon: true, Evening: false, Night: false },
          Friday: { Morning: true, Afternoon: true, Evening: true, Night: false },
          Saturday: { Morning: true, Afternoon: true, Evening: true, Night: false },
          Sunday: { Morning: false, Afternoon: true, Evening: false, Night: false }
        } as AvailabilitySchedule,
        prefs: ['Maintenance', 'Gardening', 'Cleaning'] as TaskCategory[]
      },
      {
        name: 'Maya Chen',
        email: `maya.${familyId.slice(-4)}@example.com`,
        role: 'member' as const,
        status: 'Available' as const,
        color: '#788c5d',
        slots: {
          Monday: { Morning: false, Afternoon: false, Evening: true, Night: true },
          Tuesday: { Morning: false, Afternoon: false, Evening: true, Night: true },
          Wednesday: { Morning: false, Afternoon: false, Evening: true, Night: false },
          Thursday: { Morning: false, Afternoon: true, Evening: true, Night: false },
          Friday: { Morning: false, Afternoon: false, Evening: true, Night: true },
          Saturday: { Morning: true, Afternoon: true, Evening: true, Night: false },
          Sunday: { Morning: true, Afternoon: true, Evening: true, Night: false }
        } as AvailabilitySchedule,
        prefs: ['Laundry', 'Cleaning', 'Bills'] as TaskCategory[]
      },
      {
        name: 'David Chen',
        email: `david.${familyId.slice(-4)}@example.com`,
        role: 'member' as const,
        status: 'Busy' as const, // Marked Busy for testing auto-reassignment!
        color: '#9381ff',
        slots: {
          Monday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Tuesday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Wednesday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Thursday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Friday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Saturday: { Morning: true, Afternoon: true, Evening: true, Night: false },
          Sunday: { Morning: true, Afternoon: true, Evening: true, Night: false }
        } as AvailabilitySchedule,
        prefs: ['Cooking', 'Maintenance', 'Shopping'] as TaskCategory[]
      },
      {
        name: 'Elena Chen',
        email: `elena.${familyId.slice(-4)}@example.com`,
        role: 'member' as const,
        status: 'Available' as const,
        color: '#b8b08d',
        slots: {
          Monday: { Morning: false, Afternoon: true, Evening: true, Night: false },
          Tuesday: { Morning: false, Afternoon: true, Evening: true, Night: false },
          Wednesday: { Morning: true, Afternoon: true, Evening: false, Night: false },
          Thursday: { Morning: false, Afternoon: true, Evening: true, Night: false },
          Friday: { Morning: false, Afternoon: true, Evening: true, Night: false },
          Saturday: { Morning: false, Afternoon: false, Evening: false, Night: false },
          Sunday: { Morning: true, Afternoon: true, Evening: true, Night: false }
        } as AvailabilitySchedule,
        prefs: ['Cleaning', 'Laundry', 'Gardening'] as TaskCategory[]
      }
    ];

    // Ensure current admin has rich availability & preferences
    await availabilityRepo.upsert(currentAdmin.id, {
      Monday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Tuesday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Wednesday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Thursday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Friday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Saturday: { Morning: true, Afternoon: true, Evening: true, Night: false },
      Sunday: { Morning: true, Afternoon: true, Evening: true, Night: false }
    });
    await preferencesRepo.upsert(currentAdmin.id, ['Cooking', 'Shopping', 'Bills', 'Cleaning']);

    const familyMemberIds: string[] = [currentAdmin.id];

    for (const p of demoProfiles) {
      let existing = existingMembers.find(m => m.name === p.name);
      let memId = existing?.id;
      if (!existing) {
        const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        
        await usersRepo.create({
          id: userId,
          email: p.email,
          password_hash: demoPasswordHash,
          family_id: familyId,
          created_at: now.toISOString()
        });

        const newM: Member = {
          id: memId,
          user_id: userId,
          family_id: familyId,
          name: p.name,
          email: p.email,
          phone: '+1 (555) 234-5678',
          role: p.role,
          status: p.status,
          avatar_color: p.color,
          created_at: now.toISOString()
        };
        await membersRepo.create(newM);
      } else {
        await membersRepo.update(memId!, { status: p.status, avatar_color: p.color });
      }

      await availabilityRepo.upsert(memId!, p.slots);
      await preferencesRepo.upsert(memId!, p.prefs);
      familyMemberIds.push(memId!);
    }

    // Clear old demo tasks and resources for clean seed
    const client = req.supabase;
    if (client) {
      await client.from('tasks').delete().eq('family_id', familyId);
      await client.from('resources').delete().eq('family_id', familyId);
      await client.from('reassignment_requests').delete().eq('family_id', familyId);
    }

    // 2. Create Resources (supplies, appliances, tools, and a few bills)
    const bill1Date = new Date(now);
    bill1Date.setDate(bill1Date.getDate() + 3);

    const bill2Date = new Date(now);
    bill2Date.setDate(bill2Date.getDate() + 8);

    const bill3Date = new Date(now);
    bill3Date.setDate(bill3Date.getDate() + 14);

    const resourcesToSeed: Resource[] = [
      {
        id: `res-seed-1-${familyId}`,
        family_id: familyId,
        name: 'Eco Dish Soap & Multipurpose Cleaner',
        type: 'supplies',
        quantity: 1, // Below threshold -> low stock warning!
        unit: 'bottles',
        low_stock_threshold: 2,
        notes: 'Replenish from wholesale store',
        created_at: now.toISOString()
      },
      {
        id: `res-seed-2-${familyId}`,
        family_id: familyId,
        name: 'All-Temperature Laundry Detergent',
        type: 'supplies',
        quantity: 12,
        unit: 'pods',
        low_stock_threshold: 8,
        created_at: now.toISOString()
      },
      {
        id: `res-seed-3-${familyId}`,
        family_id: familyId,
        name: 'HEPA Cordless Stick Vacuum',
        type: 'appliances',
        quantity: 1,
        unit: 'unit',
        low_stock_threshold: 0,
        notes: 'Filter cleaned bi-weekly',
        created_at: now.toISOString()
      },
      {
        id: `res-seed-4-${familyId}`,
        family_id: familyId,
        name: 'Quarterly Electric Utility Bill',
        type: 'bills',
        quantity: 1,
        unit: 'bill',
        low_stock_threshold: 0,
        due_date: bill1Date.toISOString(),
        amount: 142.50,
        notes: 'Pay via online resident portal',
        created_at: now.toISOString()
      },
      {
        id: `res-seed-5-${familyId}`,
        family_id: familyId,
        name: 'Fiber Internet & Wi-Fi Service',
        type: 'bills',
        quantity: 1,
        unit: 'bill',
        low_stock_threshold: 0,
        due_date: bill2Date.toISOString(),
        amount: 75.00,
        created_at: now.toISOString()
      },
      {
        id: `res-seed-6-${familyId}`,
        family_id: familyId,
        name: 'Municipal Water & Sewer Utility',
        type: 'bills',
        quantity: 1,
        unit: 'bill',
        low_stock_threshold: 0,
        due_date: bill3Date.toISOString(),
        amount: 63.20,
        created_at: now.toISOString()
      }
    ];

    for (const resItem of resourcesToSeed) {
      await resourcesRepo.create(resItem);
    }

    // 3. Create ~15 Varied Tasks:
    // Dates helpers
    const today = new Date(now);
    const todayAt17 = new Date(today);
    todayAt17.setHours(17, 0, 0, 0);

    const todayAt14 = new Date(today);
    todayAt14.setHours(14, 0, 0, 0);

    const todayAt20 = new Date(today);
    todayAt20.setHours(20, 0, 0, 0);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const criticalDate = new Date(now);
    criticalDate.setDate(criticalDate.getDate() + 2);
    criticalDate.setHours(15, 0, 0, 0);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const in4Days = new Date(now);
    in4Days.setDate(in4Days.getDate() + 4);

    const in5Days = new Date(now);
    in5Days.setDate(in5Days.getDate() + 5);

    const in6Days = new Date(now);
    in6Days.setDate(in6Days.getDate() + 6);

    const adminId = familyMemberIds[0];
    const alexId = familyMemberIds[1];
    const mayaId = familyMemberIds[2];
    const davidId = familyMemberIds[3];
    const elenaId = familyMemberIds[4];

    const demoTasks: Task[] = [
      // 1. Due Today - Shopping
      {
        id: `tsk-seed-1-${familyId}`,
        family_id: familyId,
        title: 'Family Grocery Run: Weekly Essentials',
        description: 'Pick up fresh produce, milk, eggs, bread and pantry staples from supermarket.',
        category: 'Shopping',
        priority: 'Medium',
        effort: 45,
        deadline: todayAt17.toISOString(),
        room: 'Pantry',
        recurring: 'None',
        status: 'Accepted',
        assigned_to_member_id: adminId,
        assigned_reason: 'Likes shopping, free on afternoon schedule',
        created_at: yesterday.toISOString()
      },
      // 2. Due Today - Maintenance
      {
        id: `tsk-seed-2-${familyId}`,
        family_id: familyId,
        title: 'Test Smoke & Carbon Monoxide Detectors',
        description: 'Press test buttons on hallway and bedroom detectors; swap dead batteries.',
        category: 'Maintenance',
        priority: 'High',
        effort: 20,
        deadline: todayAt14.toISOString(),
        room: 'Hallways',
        recurring: 'None',
        status: 'Assigned',
        assigned_to_member_id: alexId,
        assigned_reason: 'Free this morning, experienced with maintenance',
        created_at: yesterday.toISOString()
      },
      // 3. Due Today - Cleaning
      {
        id: `tsk-seed-3-${familyId}`,
        family_id: familyId,
        title: 'Vacuum & Mop Living Room Hardwood',
        description: 'Clean area rugs and mop hardwood flooring with wood-safe cleaner.',
        category: 'Cleaning',
        priority: 'Medium',
        effort: 35,
        deadline: todayAt20.toISOString(),
        room: 'Living Room',
        resource_id: `res-seed-3-${familyId}`,
        recurring: 'None',
        status: 'Assigned',
        assigned_to_member_id: elenaId,
        assigned_reason: 'Free this evening, likes cleaning',
        created_at: yesterday.toISOString()
      },
      // 4. One Overdue Task - Gardening (2 days ago)
      {
        id: `tsk-seed-4-${familyId}`,
        family_id: familyId,
        title: 'Prune Rose Bushes & Clear Yard Leaves',
        description: 'Trim back overgrown branches and rake up dead autumn leaves into compost bags.',
        category: 'Gardening',
        priority: 'Low',
        effort: 75,
        deadline: twoDaysAgo.toISOString(),
        room: 'Back Yard',
        recurring: 'None',
        status: 'Overdue',
        assigned_to_member_id: alexId,
        assigned_reason: 'Free on weekend morning, matched gardening preference',
        created_at: threeDaysAgo.toISOString()
      },
      // 5. Two Critical tasks on the SAME DAY - Critical #1
      {
        id: `tsk-seed-5-${familyId}`,
        family_id: familyId,
        title: 'Fix Leaking Bathroom Faucet',
        description: 'Shut off valve, replace worn cartridge washer, and test seals to prevent water damage.',
        category: 'Maintenance',
        priority: 'Critical',
        effort: 45,
        deadline: criticalDate.toISOString(),
        room: 'Guest Bathroom',
        recurring: 'None',
        status: 'Assigned',
        assigned_to_member_id: alexId,
        assigned_reason: 'Highest maintenance skill, free slot on scheduled day',
        created_at: yesterday.toISOString()
      },
      // 6. Two Critical tasks on the SAME DAY - Critical #2
      {
        id: `tsk-seed-6-${familyId}`,
        family_id: familyId,
        title: 'Replace Main Circuit Breaker Battery Backup',
        description: 'Critical safety check: replace backup battery pack and test surge protector status.',
        category: 'Maintenance',
        priority: 'Critical',
        effort: 30,
        deadline: criticalDate.toISOString(),
        room: 'Utility Room',
        recurring: 'None',
        status: 'Assigned',
        assigned_to_member_id: mayaId, // Assigned to Maya to avoid stacking critical tasks on Alex!
        assigned_reason: 'Free on evening schedule, prevents overloading single member',
        created_at: yesterday.toISOString()
      },
      // 7. One Weekly Recurring Task
      {
        id: `tsk-seed-7-${familyId}`,
        family_id: familyId,
        title: 'Sort & Wash Family Bed Linens',
        description: 'Strip bed sheets, pillow covers, wash on sanitize cycle and dry thoroughly.',
        category: 'Laundry',
        priority: 'Medium',
        effort: 50,
        deadline: in4Days.toISOString(),
        room: 'Laundry Room',
        resource_id: `res-seed-2-${familyId}`,
        recurring: 'Weekly',
        status: 'Assigned',
        assigned_to_member_id: elenaId,
        assigned_reason: 'Likes laundry, lightest workload this week',
        created_at: yesterday.toISOString()
      },
      // 8. Completed task 1
      {
        id: `tsk-seed-8-${familyId}`,
        family_id: familyId,
        title: 'Meal Prep: Healthy Dinners for Week',
        description: 'Pre-cooked roasted vegetables, quinoa bowls, and marinated proteins.',
        category: 'Cooking',
        priority: 'Medium',
        effort: 90,
        deadline: yesterday.toISOString(),
        room: 'Kitchen',
        recurring: 'None',
        status: 'Completed',
        assigned_to_member_id: adminId,
        assigned_reason: 'Loves cooking, free Sunday morning',
        created_at: threeDaysAgo.toISOString(),
        completed_at: yesterday.toISOString()
      },
      // 9. Completed task 2
      {
        id: `tsk-seed-9-${familyId}`,
        family_id: familyId,
        title: 'Clean Refrigerator & Check Expiration Dates',
        description: 'Wiped down shelves, threw out expired sauces and cleaned vegetable crisper drawers.',
        category: 'Cleaning',
        priority: 'Low',
        effort: 40,
        deadline: threeDaysAgo.toISOString(),
        room: 'Kitchen',
        recurring: 'None',
        status: 'Completed',
        assigned_to_member_id: elenaId,
        assigned_reason: 'Likes cleaning, completed efficiently',
        created_at: new Date(now.getTime() - 4 * 86400000).toISOString(),
        completed_at: threeDaysAgo.toISOString()
      },
      // 10. Completed task 3
      {
        id: `tsk-seed-10-${familyId}`,
        family_id: familyId,
        title: 'Fold and Put Away Fresh Towels',
        description: 'Folded bath sheets and stocked bathroom closets neatly.',
        category: 'Laundry',
        priority: 'Low',
        effort: 20,
        deadline: yesterday.toISOString(),
        room: 'Linen Closet',
        recurring: 'None',
        status: 'Completed',
        assigned_to_member_id: mayaId,
        assigned_reason: 'Quick task, matched laundry preference',
        created_at: twoDaysAgo.toISOString(),
        completed_at: yesterday.toISOString()
      },
      // 11. In Progress task
      {
        id: `tsk-seed-11-${familyId}`,
        family_id: familyId,
        title: 'Deep Clean Kitchen & Range Hood Filter',
        description: 'Degrease steel mesh filters, clean stove top burners and wipe backsplash.',
        category: 'Cleaning',
        priority: 'High',
        effort: 60,
        deadline: in3Days.toISOString(),
        room: 'Kitchen',
        resource_id: `res-seed-1-${familyId}`,
        recurring: 'None',
        status: 'In Progress',
        assigned_to_member_id: elenaId,
        assigned_reason: 'Dedicated cleaning preference, started afternoon shift',
        created_at: yesterday.toISOString()
      },
      // 12. Bills review task
      {
        id: `tsk-seed-12-${familyId}`,
        family_id: familyId,
        title: 'Review and Pay Quarterly Electric Bill',
        description: 'Verify smart meter readings, apply solar credits, and authorize digital payment.',
        category: 'Bills',
        priority: 'High',
        effort: 20,
        deadline: bill1Date.toISOString(),
        room: 'Home Office',
        resource_id: `res-seed-4-${familyId}`,
        recurring: 'None',
        status: 'Pending',
        assigned_to_member_id: null,
        assigned_reason: 'Pending assignment: awaiting schedule match',
        created_at: yesterday.toISOString()
      },
      // 13. Sunday Family Lunch
      {
        id: `tsk-seed-13-${familyId}`,
        family_id: familyId,
        title: 'Prepare Sunday Family Gathering Lunch',
        description: 'Bake focaccia bread, roast organic chicken, and prepare garden salad.',
        category: 'Cooking',
        priority: 'High',
        effort: 85,
        deadline: in5Days.toISOString(),
        room: 'Kitchen',
        recurring: 'None',
        status: 'Pending',
        assigned_to_member_id: null,
        created_at: yesterday.toISOString()
      },
      // 14. Restock Cleaning Supplies
      {
        id: `tsk-seed-14-${familyId}`,
        family_id: familyId,
        title: 'Restock Cleaning Detergents & Sponges',
        description: 'Order refill containers of plant-based soap and replacement scrubber pads.',
        category: 'Shopping',
        priority: 'Low',
        effort: 25,
        deadline: in6Days.toISOString(),
        room: 'Laundry Room',
        recurring: 'None',
        status: 'Accepted',
        assigned_to_member_id: adminId,
        assigned_reason: 'Lightest workload among shopping-preferred members',
        created_at: yesterday.toISOString()
      },
      // 15. Inspect Irrigation
      {
        id: `tsk-seed-15-${familyId}`,
        family_id: familyId,
        title: 'Inspect Lawn Irrigation Sprinklers',
        description: 'Check pop-up nozzles, adjust spray radius, and fix any clogged heads.',
        category: 'Gardening',
        priority: 'Medium',
        effort: 40,
        deadline: in4Days.toISOString(),
        room: 'Front Yard',
        recurring: 'None',
        status: 'Pending',
        assigned_to_member_id: null,
        created_at: yesterday.toISOString()
      }
    ];

    for (const t of demoTasks) {
      await tasksRepo.create(t);

      if (t.assigned_to_member_id && t.status !== 'Completed') {
        await assignmentsRepo.create({
          id: `asg-${t.id}`,
          task_id: t.id,
          member_id: t.assigned_to_member_id,
          status: t.status === 'Accepted' || t.status === 'In Progress' ? 'Accepted' : 'Offered',
          suggested_reason_sentence: t.assigned_reason,
          created_at: t.created_at
        });
      }
    }

    // 4. Activity logs & notifications
    await activityLogsRepo.create({
      id: `log-seed-1-${familyId}`,
      family_id: familyId,
      actor_name: currentAdmin.name,
      action: 'Demo Dataset Initialized',
      details: 'Loaded 5 household members, 15 tasks, and household utility resources.',
      created_at: now.toISOString()
    });

    await notificationsRepo.create({
      id: `notif-seed-1-${familyId}`,
      family_id: familyId,
      member_id: null,
      type: 'overdue',
      title: 'Task Overdue: Prune Rose Bushes & Clear Yard Leaves',
      message: 'Yard maintenance missed its deadline 2 days ago. Please review.',
      link: '/tasks',
      read: false,
      created_at: now.toISOString()
    });

    await notificationsRepo.create({
      id: `notif-seed-2-${familyId}`,
      family_id: familyId,
      member_id: alexId,
      type: 'task_assigned',
      title: 'Critical Task: Fix Leaking Bathroom Faucet',
      message: 'Highest maintenance skill, free slot on scheduled day.',
      link: '/tasks',
      read: false,
      created_at: now.toISOString()
    });

    eventBus.broadcast(familyId, 'data_updated', { type: 'demo_seeded' });

    res.json({
      success: true,
      message: 'Demo dataset loaded successfully: 5 members, 15 tasks, recurring setup, and resources.',
      membersCount: 5,
      tasksCount: demoTasks.length,
      resourcesCount: resourcesToSeed.length
    });
  } catch (err: any) {
    console.error('Seed demo data error:', err);
    res.status(500).json({ error: 'Failed to load demo data.' });
  }
});

// POST /api/demo/reset - Reset family tasks, resources, and non-admin members
router.post('/reset', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can reset family data.' });
      return;
    }

    const familyId = req.member!.family_id;
    const currentAdminId = req.member!.id;

    const client = req.supabase;
    if (client) {
      await client.from('tasks').delete().eq('family_id', familyId);
      await client.from('resources').delete().eq('family_id', familyId);
      await client.from('reassignment_requests').delete().eq('family_id', familyId);
      await client.from('notifications').delete().eq('family_id', familyId);
      await client.from('members').delete().eq('family_id', familyId).neq('id', currentAdminId);
    }

    // Reset admin status to Available
    await membersRepo.updateStatus(currentAdminId, 'Available');

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Family Data Reset',
      details: 'All family tasks, resources, and guest members were cleared.',
      created_at: new Date().toISOString()
    });

    eventBus.broadcast(familyId, 'data_updated', { type: 'family_reset' });

    res.json({
      success: true,
      message: 'Family data has been reset to fresh state.'
    });
  } catch (err: any) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset family data.' });
  }
});

export default router;
