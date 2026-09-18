import {
  MAX_PROOF_PHOTO_CHARS,
  TaskCategory,
  TaskRecurrence,
  taskCategoryIcon,
} from '@kidsapp/shared';
import { Router, Request, Response } from 'express';
import { authenticate, requireParent } from '../middleware/auth';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { TaskCompletion } from '../models/TaskCompletion';
import { TaskTemplate } from '../models/TaskTemplate';
import { formatCompletion, formatTask, formatUser } from '../utils/format';
import {
  getTaskCompletionStatus,
  completionBlockedMessage,
} from '../utils/taskAvailability';
import { bumpFamilyChallengeProgress } from '../services/familyChallenge';

const router = Router();

function formatTaskTemplate(doc: InstanceType<typeof TaskTemplate>) {
  return {
    _id: doc._id.toString(),
    familyId: doc.familyId.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    points: doc.points,
    recurrence: doc.recurrence as TaskRecurrence,
  };
}

async function upsertFamilyTemplate(
  familyId: string,
  data: {
    title: string;
    description: string;
    category: TaskCategory;
    points: number;
    recurrence: TaskRecurrence;
  }
) {
  return TaskTemplate.findOneAndUpdate(
    { familyId, title: data.title },
    {
      $set: {
        description: data.description,
        category: data.category,
        points: data.points,
        recurrence: data.recurrence,
      },
      $setOnInsert: { familyId, title: data.title },
    },
    { upsert: true, new: true }
  );
}

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
      tasks: tasks.map((t) =>
        formatTask(
          t,
          getTaskCompletionStatus(t.recurrence, completionsByTask.get(t._id.toString()) ?? [])
        )
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת משימות' });
  }
});

router.get('/templates', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const templates = await TaskTemplate.find({ familyId: req.user!.familyId }).sort({ createdAt: -1 });
    res.json({ templates: templates.map(formatTaskTemplate) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת משימות מוכנות' });
  }
});

router.post('/templates', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, category, points, recurrence } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const template = await upsertFamilyTemplate(req.user!.familyId, {
      title: String(title).trim(),
      description: description || '',
      category: category as TaskCategory,
      points: Number(points) || 20,
      recurrence: (recurrence || 'daily') as TaskRecurrence,
    });

    res.status(201).json({ template: formatTaskTemplate(template!) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת משימה מוכנה' });
  }
});

router.delete('/templates/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const deleted = await TaskTemplate.findOneAndDelete({
      _id: req.params.id,
      familyId: req.user!.familyId,
    });
    if (!deleted) return res.status(404).json({ error: 'משימה מוכנה לא נמצאה' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת משימה מוכנה' });
  }
});

router.post('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      points,
      recurrence,
      assignedTo,
      icon,
      saveAsTemplate,
      learningPackId,
    } = req.body;

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

    const packId =
      typeof learningPackId === 'string' && learningPackId.trim()
        ? learningPackId.trim()
        : undefined;

    const payload = {
      familyId: req.user!.familyId,
      title,
      description: description || '',
      category,
      points: Number(points) || 20,
      recurrence: recurrence || 'daily',
      icon: icon || taskCategoryIcon(category as TaskCategory),
      ...(packId ? { learningPackId: packId } : {}),
    };

    const created = await Task.insertMany(
      kids.map((kid) => ({ ...payload, assignedTo: kid._id }))
    );

    if (saveAsTemplate) {
      await upsertFamilyTemplate(req.user!.familyId, {
        title: payload.title,
        description: payload.description,
        category: payload.category as TaskCategory,
        points: payload.points,
        recurrence: payload.recurrence as TaskRecurrence,
      });
    }

    const tasks = created.map((task) => ({
      _id: task._id.toString(),
      familyId: String(task.familyId),
      title: task.title,
      description: task.description,
      category: task.category,
      points: task.points,
      recurrence: task.recurrence,
      assignedTo: String(task.assignedTo),
      icon: task.icon,
      isActive: task.isActive,
      learningPackId: task.learningPackId,
      createdAt: (task.createdAt instanceof Date
        ? task.createdAt
        : new Date()
      ).toISOString(),
    }));

    const { pushTaskAssigned } = await import('../services/push');
    pushTaskAssigned(
      kids.map((k) => k._id.toString()),
      payload.title
    );

    res.status(201).json({ task: tasks[0], tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת משימה' });
  }
});

router.put('/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, category, points, recurrence, icon, learningPackId } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (points !== undefined) updates.points = Number(points) || 20;
    if (recurrence !== undefined) updates.recurrence = recurrence;
    if (icon !== undefined) updates.icon = icon;
    else if (category !== undefined) updates.icon = taskCategoryIcon(category as TaskCategory);
    if (learningPackId !== undefined) {
      updates.learningPackId =
        typeof learningPackId === 'string' && learningPackId.trim()
          ? learningPackId.trim()
          : null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user!.familyId },
      updates,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    res.json({ task: formatTask(task) });
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

    let proofPhoto: string | undefined;
    if (typeof req.body.proofPhoto === 'string' && req.body.proofPhoto.trim()) {
      const raw = req.body.proofPhoto.trim();
      if (raw.length > MAX_PROOF_PHOTO_CHARS) {
        return res.status(400).json({ error: 'התמונה גדולה מדי. נסו תמונה קטנה יותר.' });
      }
      if (!raw.startsWith('data:image/')) {
        return res.status(400).json({ error: 'פורמט תמונה לא תקין' });
      }
      proofPhoto = raw;
    }

    const completion = await TaskCompletion.create({
      taskId: task._id,
      kidId,
      familyId: req.user!.familyId,
      status: 'pending',
      ...(proofPhoto ? { proofPhoto } : {}),
    });

    const kid = await User.findById(kidId).select('displayName');
    const { pushTaskSubmitted } = await import('../services/push');
    pushTaskSubmitted(
      req.user!.familyId,
      kid?.displayName || 'ילד',
      task.title,
      req.user!.role === 'parent' ? req.user!.userId : undefined
    );

    res.status(201).json({
      completion: formatCompletion(completion),
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
        ...formatCompletion(c),
        task:
          c.taskId && typeof c.taskId === 'object'
            ? {
                _id: (c.taskId as any)._id.toString(),
                title: (c.taskId as any).title,
                points: (c.taskId as any).points,
                icon: (c.taskId as any).icon,
                category: (c.taskId as any).category,
              }
            : undefined,
        kid:
          c.kidId && typeof c.kidId === 'object'
            ? {
                _id: (c.kidId as any)._id.toString(),
                displayName: (c.kidId as any).displayName,
                avatar: (c.kidId as any).avatar,
              }
            : undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת בקשות' });
  }
});

router.post('/completions/:id/approve', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { action, rejectNote } = req.body;
    const completion = await TaskCompletion.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      status: 'pending',
    }).populate('taskId');

    if (!completion) return res.status(404).json({ error: 'בקשה לא נמצאה' });

    const task = completion.taskId as any;
    const { pushTaskReviewed } = await import('../services/push');

    if (action === 'reject') {
      const note = typeof rejectNote === 'string' ? rejectNote.trim().slice(0, 500) : '';
      if (!note) {
        return res.status(400).json({ error: 'יש לכתוב סיבת דחייה' });
      }
      completion.status = 'rejected';
      completion.rejectNote = note;
      completion.reviewedAt = new Date();
      completion.reviewedBy = req.user!.userId as any;
      await completion.save();
      pushTaskReviewed(completion.kidId.toString(), task?.title || 'משימה', false, undefined, note);
      return res.json({ completion: formatCompletion(completion) });
    }

    const kid = await User.findById(completion.kidId);
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const { awardPoints } = await import('../services/gamification');

    completion.status = 'approved';
    completion.reviewedAt = new Date();
    completion.reviewedBy = req.user!.userId as any;
    await completion.save();

    await awardPoints(kid, task.points, 'task', `משימה: ${task.title}`, completion._id.toString());
    await bumpFamilyChallengeProgress(req.user!.familyId);

    pushTaskReviewed(kid._id.toString(), task.title, true, task.points);

    const updatedKid = await User.findById(kid._id);
    res.json({ completion: formatCompletion(completion), kid: formatUser(updatedKid ?? kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה באישור משימה' });
  }
});

export default router;
