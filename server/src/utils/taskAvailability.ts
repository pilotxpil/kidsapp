import type { TaskRecurrence } from '@kidsapp/shared';

export type TaskCompletionStatus = 'available' | 'pending' | 'completed';

type CompletionLike = {
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return dayKey(date);
}

export function getTaskCompletionStatus(
  recurrence: TaskRecurrence,
  completions: CompletionLike[]
): TaskCompletionStatus {
  if (completions.some((c) => c.status === 'pending')) {
    return 'pending';
  }

  const approved = completions.filter((c) => c.status === 'approved');
  const now = new Date();

  if (recurrence === 'once') {
    return approved.length > 0 ? 'completed' : 'available';
  }

  if (recurrence === 'daily') {
    const today = dayKey(now);
    const doneToday = approved.some((c) => c.reviewedAt && dayKey(c.reviewedAt) === today);
    return doneToday ? 'completed' : 'available';
  }

  if (recurrence === 'weekly') {
    const thisWeek = weekKey(now);
    const doneThisWeek = approved.some((c) => c.reviewedAt && weekKey(c.reviewedAt) === thisWeek);
    return doneThisWeek ? 'completed' : 'available';
  }

  return 'available';
}

export function completionBlockedMessage(recurrence: TaskRecurrence): string {
  if (recurrence === 'daily') return 'המשימה כבר הושלמה היום';
  if (recurrence === 'weekly') return 'המשימה כבר הושלמה השבוע';
  return 'המשימה כבר הושלמה';
}
