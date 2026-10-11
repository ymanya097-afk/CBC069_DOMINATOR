import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { resourcesRepo } from '../repositories/resourcesRepo.ts';
import { activityLogsRepo } from '../repositories/activityLogsRepo.ts';
import { Resource, ResourceType } from '../types.ts';

const router = Router();

// GET /api/resources - List household resources
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const familyId = req.member!.family_id;
    const resources = await resourcesRepo.findByFamilyId(familyId);
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

// POST /api/resources - Create resource (Admin only)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can add household resources.' });
      return;
    }

    const { name, type, quantity, unit, low_stock_threshold, due_date, amount, notes } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Name and type are required.' });
      return;
    }

    const familyId = req.member!.family_id;
    const now = new Date().toISOString();
    const id = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newResource: Resource = {
      id,
      family_id: familyId,
      name: name.trim(),
      type: type as ResourceType,
      quantity: Number(quantity) || 0,
      unit: unit ? unit.trim() : 'units',
      low_stock_threshold: Number(low_stock_threshold) || 0,
      due_date: due_date || null,
      amount: amount !== undefined && amount !== '' ? Number(amount) : null,
      notes: notes ? notes.trim() : '',
      created_at: now
    };

    const created = await resourcesRepo.create(newResource);

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: familyId,
      actor_name: req.member!.name,
      action: 'Resource Added',
      details: `Added ${created.name} (${created.type})`,
      created_at: now
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create resource.' });
  }
});

// PUT /api/resources/:id - Update resource (Admin only)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can modify household resources.' });
      return;
    }

    const resource = await resourcesRepo.findById(req.params.id);
    if (!resource || resource.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Resource not found.' });
      return;
    }

    const { name, type, quantity, unit, low_stock_threshold, due_date, amount, notes } = req.body;

    const updates: Partial<Resource> = {};
    if (name) updates.name = name.trim();
    if (type) updates.type = type;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (unit) updates.unit = unit.trim();
    if (low_stock_threshold !== undefined) updates.low_stock_threshold = Number(low_stock_threshold);
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (amount !== undefined) updates.amount = amount !== '' ? Number(amount) : null;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : '';

    const updated = await resourcesRepo.update(resource.id, updates);

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: resource.family_id,
      actor_name: req.member!.name,
      action: 'Resource Updated',
      details: `Updated ${updated?.name}`,
      created_at: new Date().toISOString()
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update resource.' });
  }
});

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.member!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can delete resources.' });
      return;
    }

    const resource = await resourcesRepo.findById(req.params.id);
    if (!resource || resource.family_id !== req.member!.family_id) {
      res.status(404).json({ error: 'Resource not found.' });
      return;
    }

    await resourcesRepo.delete(resource.id);

    await activityLogsRepo.create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      family_id: resource.family_id,
      actor_name: req.member!.name,
      action: 'Resource Deleted',
      details: `Deleted ${resource.name}`,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, message: `Resource "${resource.name}" removed.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete resource.' });
  }
});

export default router;
