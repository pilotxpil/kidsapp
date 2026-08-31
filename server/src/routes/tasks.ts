import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { TaskCategory, taskCategoryIcon } from '@kidsapp/shared';
import { authenticate, requireParent } from '../middleware/auth';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { TaskCompletion } from '../models/TaskCompletion';
import { formatUser } from '../utils/format';
import {
  getTaskCompletionStatus,
  completionBlockedMessage,
} from '../utils/taskAvailability';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { kidId } = req.query;
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (kidId as string);

    if (!targetKidId) {
      return res.status(400).json({ error: 'נדרש kidId' });
    }

    const tasks = await Task.find({
      familyId: req.user!.familyId,
      assignedTo: targetKidId,
      isActive: true,
    }).sort({ createdAt: -1 });

    const taskIds = tasks.map((t) => t._id);
    const completions = taskIds.length
      ? await TaskCompletion.find({
          taskId: { $in: taskIds },
          kidId: targetKidId,
          status: { $in: ['pending', 'approved'] },
        })
      : [];

    const completionsByTask = new Map<string, typeof completions>();
    for (const c of completions) {
      const key = c.taskId.toString();
      if (!completionsByTask.has(key)) completionsByTask.set(key, []);
      completionsByTask.get(key)!.push(c);
    }

    res.json({
      tasks: tasks.map((t) => ({
        _id: t._id.toString(),
        familyId: t.familyId.toString(),
        title: t.title,
        description: t.description,
        category: t.category,
        points: t.points,
        recurrence: t.recurrence,
        assignedTo: t.assignedTo.toString(),
        icon: t.icon,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        completionStatus: getTaskCompletionStatus(
          t.recurrence,
          completionsByTask.get(t._id.toString()) ?? []
        ),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת משימות' });
  }
});

router.post('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, category, points, recurrence, assignedTo, icon } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const rawIds: unknown[] = Array.isArray(assignedTo)
      ? assignedTo
      : assignedTo
        ? [assignedTo]
        : [];

    const kidIds = [...new Set(rawIds.map(String).filter(Boolean))];
    if (kidIds.length === 0) {
      return res.status(400).json({ error: 'יש לבחור לפחות ילד אחד' });
    }

    const kids = await User.find({
      _id: { $in: kidIds },
      familyId: req.user!.familyId,
      role: 'kid',
    });

    if (kids.length !== kidIds.length) {
      return res.status(400).json({ error: 'אחד או יותר מהילדים לא נמצאו במשפחה' });
    }

    const payload = {
      familyId: req.user!.familyId,
      title,
      description: description || '',
      category,
      points: Number(points) || 20,
      recurrence: recurrence || 'daily',
      icon: icon || taskCategoryIcon(category as TaskCategory),
    };

    const created = await Task.insertMany(
      kids.map((kid) => ({ ...payload, assignedTo: kid._id }))
    );

    const tasks = created.map((task) => ({
      _id: task._id.toString(),
      familyId: task.familyId.toString(),
      title: task.title,
      description: task.description,
      category: task.category,
      points: task.points,
      recurrence: task.recurrence,
      assignedTo: task.assignedTo.toString(),
      icon: task.icon,
      isActive: task.isActive,
      createdAt: task.createdAt.toISOString(),
    }));

    res.status(201).json({ task: tasks[0], tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת משימה' });
  }
});

router.put('/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, category, points, recurrence, icon } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (points !== undefined) updates.points = Number(points) || 20;
    if (recurrence !== undefined) updates.recurrence = recurrence;
    if (icon !== undefined) updates.icon = icon;
    else if (category !== undefined) updates.icon = taskCategoryIcon(category as TaskCategory);

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user!.familyId },
      updates,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    res.json({
      task: {
        _id: task._id.toString(),
        familyId: task.familyId.toString(),
        title: task.title,
        description: task.description,
        category: task.category,
        points: task.points,
        recurrence: task.recurrence,
        assignedTo: task.assignedTo.toString(),
        icon: task.icon,
        isActive: task.isActive,
        createdAt: task.createdAt.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון משימה' });
  }
});

router.delete('/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    await Task.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user!.familyId },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת משימה' });
  }
});

router.post('/:id/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
    });

    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

    const kidId = req.user!.role === 'kid' ? req.user!.userId : req.body.kidId;
    if (!kidId) return res.status(400).json({ error: 'נדרש kidId' });

    const existing = await TaskCompletion.find({
      taskId: task._id,
      kidId,
      status: { $in: ['pending', 'approved'] },
    });

    const status = getTaskCompletionStatus(task.recurrence, existing);
    if (status === 'pending') {
      return res.status(400).json({ error: 'כבר יש בקשה ממתינה למשימה זו' });
    }
    if (status === 'completed') {
      return res.status(400).json({ error: completionBlockedMessage(task.recurrence) });
    }

    const completion = await TaskCompletion.create({
      taskId: task._id,
      kidId,
      familyId: req.user!.familyId,
      status: 'pending',
    });

    res.status(201).json({
      completion: {
        _id: completion._id.toString(),
        taskId: completion.taskId.toString(),
        kidId: completion.kidId.toString(),
        familyId: completion.familyId.toString(),
        status: completion.status,
        submittedAt: completion.submittedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בסימון משימה' });
  }
});

router.get('/completions/pending', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const completions = await TaskCompletion.find({
      familyId: req.user!.familyId,
      status: 'pending',
    })
      .populate('taskId')
      .populate('kidId', 'displayName avatar')
      .sort({ submittedAt: -1 });

    res.json({
      completions: completions.map((c) => ({
        _id: c._id.toString(),
        taskId: c.taskId.toString(),
        kidId: c.kidId.toString(),
        familyId: c.familyId.toString(),
        status: c.status,
        submittedAt: c.submittedAt.toISOString(),
        task: c.taskId && typeof c.taskId === 'object' ? {
          _id: (c.taskId as any)._id.toString(),
          title: (c.taskId as any).title,
          points: (c.taskId as any).points,
          icon: (c.taskId as any).icon,
          category: (c.taskId as any).category,
        } : undefined,
        kid: c.kidId && typeof c.kidId === 'object' ? {
          _id: (c.kidId as any)._id.toString(),
          displayName: (c.kidId as any).displayName,
          avatar: (c.kidId as any).avatar,
        } : undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת בקשות' });
  }
});

router.post('/completions/:id/approve', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    const completion = await TaskCompletion.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      status: 'pending',
    }).populate('taskId');

    if (!completion) return res.status(404).json({ error: 'בקשה לא נמצאה' });

    if (action === 'reject') {
      completion.status = 'rejected';
      completion.reviewedAt = new Date();
      completion.reviewedBy = req.user!.userId as any;
      await completion.save();
      return res.json({ completion });
    }

    const task = completion.taskId as any;
    const kid = await User.findById(completion.kidId);
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const { awardPoints } = await import('../services/gamification');

    completion.status = 'approved';
    completion.reviewedAt = new Date();
    completion.reviewedBy = req.user!.userId as any;
    await completion.save();

    await awardPoints(kid, task.points, 'task', `משימה: ${task.title}`, completion._id.toString());

    const updatedKid = await User.findById(kid._id);
    res.json({ completion, kid: formatUser(updatedKid ?? kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה באישור משימה' });
  }
});

export default router;
