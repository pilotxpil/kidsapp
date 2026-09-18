import { Task } from '../models/Task';
import { TaskCompletion } from '../models/TaskCompletion';
import { User } from '../models/User';
import { getTaskCompletionStatus } from '../utils/taskAvailability';
import { bumpFamilyChallengeProgress } from './familyChallenge';
import { awardPoints } from './gamification';

/** Auto-approve open homework tasks linked to a completed learning pack. */
export async function completeHomeworkForPack(
  kidId: string,
  familyId: string,
  packId: string
): Promise<void> {
  const tasks = await Task.find({
    familyId,
    assignedTo: kidId,
    learningPackId: packId,
    isActive: true,
  });

  for (const task of tasks) {
    const existing = await TaskCompletion.find({
      taskId: task._id,
      kidId,
      status: { $in: ['pending', 'approved'] },
    });
    const status = getTaskCompletionStatus(task.recurrence, existing);
    if (status === 'completed' || status === 'pending') continue;

    const kid = await User.findById(kidId);
    if (!kid) continue;

    const completion = await TaskCompletion.create({
      taskId: task._id,
      kidId,
      familyId,
      status: 'approved',
      reviewedAt: new Date(),
    });

    await awardPoints(
      kid,
      task.points,
      'task',
      `שיעורי בית: ${task.title}`,
      completion._id.toString()
    );
    await bumpFamilyChallengeProgress(familyId);
  }
}
