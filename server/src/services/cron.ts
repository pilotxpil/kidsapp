import cron from 'node-cron';
import { Task } from '../models/Task';
import { TaskCompletion } from '../models/TaskCompletion';
import { User } from '../models/User';
import { getTaskCompletionStatus } from '../utils/taskAvailability';
import { notifyUsers } from './push';

let lastRunDate = '';

async function sendEveningIncompleteReminders(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  if (lastRunDate === today) return;
  lastRunDate = today;

  console.log('[cron] evening incomplete-task reminders', today);

  const kids = await User.find({ role: 'kid' }).select('_id familyId displayName');
  for (const kid of kids) {
    try {
      const tasks = await Task.find({
        familyId: kid.familyId,
        assignedTo: kid._id,
        isActive: true,
      });
      if (tasks.length === 0) continue;

      const taskIds = tasks.map((t) => t._id);
      const completions = await TaskCompletion.find({
        taskId: { $in: taskIds },
        kidId: kid._id,
        status: { $in: ['pending', 'approved'] },
      });

      const byTask = new Map<string, typeof completions>();
      for (const c of completions) {
        const key = c.taskId.toString();
        if (!byTask.has(key)) byTask.set(key, []);
        byTask.get(key)!.push(c);
      }

      const incomplete = tasks.filter((t) => {
        const status = getTaskCompletionStatus(t.recurrence, byTask.get(t._id.toString()) ?? []);
        return status === 'available';
      });

      if (incomplete.length === 0) continue;

      await notifyUsers([kid._id.toString()], {
        title: 'תזכורת ערב 📋',
        body: `יש ${incomplete.length} משימות שלא הושלמו היום`,
        data: {
          type: 'tasks_incomplete_evening',
          count: String(incomplete.length),
        },
      });
    } catch (err) {
      console.error('[cron] evening reminder failed for kid', kid._id.toString(), err);
    }
  }
}

/** 19:00 Asia/Jerusalem — once per calendar day. */
export function startScheduledJobs(): void {
  cron.schedule(
    '0 19 * * *',
    () => {
      sendEveningIncompleteReminders().catch((err) => console.error('[cron]', err));
    },
    { timezone: 'Asia/Jerusalem' }
  );
  console.log('[cron] evening incomplete-task job scheduled (19:00 Asia/Jerusalem)');
}
