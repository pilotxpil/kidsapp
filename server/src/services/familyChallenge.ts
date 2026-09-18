import {
  DEFAULT_FAMILY_CHALLENGE_REWARD_POINTS,
  DEFAULT_FAMILY_CHALLENGE_TARGET,
} from '@kidsapp/shared';
import { FamilyChallenge, IFamilyChallenge } from '../models/FamilyChallenge';
import { User } from '../models/User';
import { currentWeekKey, formatFamilyChallenge } from '../utils/format';
import { awardPoints } from './gamification';

export async function getOrCreateWeeklyChallenge(familyId: string): Promise<IFamilyChallenge> {
  const weekKey = currentWeekKey();
  let challenge = await FamilyChallenge.findOne({ familyId, weekKey });
  if (challenge) return challenge;

  challenge = await FamilyChallenge.create({
    familyId,
    weekKey,
    title: 'אתגר משפחתי שבועי',
    targetCount: DEFAULT_FAMILY_CHALLENGE_TARGET,
    progress: 0,
    rewardTitle: 'פרס משותף לכל האחים',
    rewardPoints: DEFAULT_FAMILY_CHALLENGE_REWARD_POINTS,
    completed: false,
  });
  return challenge;
}

export async function bumpFamilyChallengeProgress(familyId: string): Promise<void> {
  const challenge = await getOrCreateWeeklyChallenge(familyId);
  if (challenge.completed) return;

  challenge.progress += 1;
  if (challenge.progress >= challenge.targetCount) {
    challenge.completed = true;
    challenge.claimedAt = new Date();
    await challenge.save();

    const kids = await User.find({ familyId, role: 'kid' });
    for (const kid of kids) {
      await awardPoints(
        kid,
        challenge.rewardPoints,
        'bonus',
        `אתגר משפחתי: ${challenge.title}`,
        challenge._id.toString()
      );
    }

    const { notifyUsers } = await import('./push');
    await notifyUsers(
      kids.map((k) => k._id.toString()),
      {
        title: 'אתגר משפחתי הושלם! 🎉',
        body: `כל האחים קיבלו ${challenge.rewardPoints} נקודות — ${challenge.rewardTitle}`,
        data: { type: 'family_challenge_complete', challengeId: challenge._id.toString() },
      }
    );
    return;
  }

  await challenge.save();
}

export { formatFamilyChallenge };
