import { Types } from 'mongoose';
import { Family } from '../models/Family';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { TaskCompletion } from '../models/TaskCompletion';
import { TaskTemplate } from '../models/TaskTemplate';
import { Reward } from '../models/Reward';
import { Redemption } from '../models/Redemption';
import { PointTransaction } from '../models/PointTransaction';
import { PushToken } from '../models/PushToken';
import { DailyWordClaim } from '../models/DailyWordClaim';
import { DailyRiddleClaim } from '../models/DailyRiddleClaim';
import { ShopDailyDeal } from '../models/ShopDailyDeal';
import { FamilyChallenge } from '../models/FamilyChallenge';
import { FamilyLearningPack } from '../models/FamilyLearningPack';
import { FamilyHiddenLearningPack } from '../models/FamilyHiddenLearningPack';
import { LearningAssignment } from '../models/LearningAssignment';
import { LearningPackSettings } from '../models/LearningPackSettings';
import { LearningProgress } from '../models/LearningProgress';

/** Removes one kid and everything that belongs only to them. */
export async function deleteKidData(familyId: string, kidId: string) {
  const fid = new Types.ObjectId(familyId);
  const kid = new Types.ObjectId(kidId);
  const tasks = await Task.find({ familyId: fid, assignedTo: kid }).select('_id');
  const taskIds = tasks.map((t) => t._id);
  await Promise.all([
    TaskCompletion.deleteMany({ familyId: fid, $or: [{ kidId: kid }, { taskId: { $in: taskIds } }] }),
    Task.deleteMany({ _id: { $in: taskIds } }),
    Redemption.deleteMany({ familyId: fid, kidId: kid }),
    PointTransaction.deleteMany({ familyId: fid, kidId: kid }),
    PushToken.deleteMany({ userId: kid }),
    DailyWordClaim.deleteMany({ familyId: fid, kidId: kid }),
    DailyRiddleClaim.deleteMany({ familyId: fid, kidId: kid }),
    ShopDailyDeal.deleteMany({ familyId: fid, kidId: kid }),
    LearningAssignment.deleteMany({ familyId: fid, kidId: kid }),
    LearningProgress.deleteMany({ familyId: fid, kidId: kid }),
  ]);
  await User.deleteOne({ _id: kid, familyId: fid, role: 'kid' });
}

/** Removes a whole family: all parents, kids and family-scoped data. */
export async function deleteFamilyData(familyId: string) {
  const fid = new Types.ObjectId(familyId);
  const users = await User.find({ familyId: fid }).select('_id');
  const userIds = users.map((u) => u._id);
  await Promise.all([
    Task.deleteMany({ familyId: fid }),
    TaskCompletion.deleteMany({ familyId: fid }),
    TaskTemplate.deleteMany({ familyId: fid }),
    Reward.deleteMany({ familyId: fid }),
    Redemption.deleteMany({ familyId: fid }),
    PointTransaction.deleteMany({ familyId: fid }),
    PushToken.deleteMany({ $or: [{ familyId: fid }, { userId: { $in: userIds } }] }),
    DailyWordClaim.deleteMany({ familyId: fid }),
    DailyRiddleClaim.deleteMany({ familyId: fid }),
    ShopDailyDeal.deleteMany({ familyId: fid }),
    FamilyChallenge.deleteMany({ familyId: fid }),
    FamilyLearningPack.deleteMany({ familyId: fid }),
    FamilyHiddenLearningPack.deleteMany({ familyId: fid }),
    LearningAssignment.deleteMany({ familyId: fid }),
    LearningPackSettings.deleteMany({ familyId: fid }),
    LearningProgress.deleteMany({ familyId: fid }),
  ]);
  await User.deleteMany({ familyId: fid });
  await Family.deleteOne({ _id: fid });
}

/**
 * Deletes a parent account. When another parent remains, only this parent leaves the family;
 * otherwise the entire family (kids included) is deleted.
 */
export async function deleteParentAccount(parentId: string, familyId: string): Promise<'left' | 'family'> {
  const family = await Family.findById(familyId);
  const others = (family?.parentIds ?? []).filter((id) => id.toString() !== parentId);
  if (family && others.length > 0) {
    family.parentIds = others;
    if (family.parentId?.toString() === parentId) family.parentId = others[0];
    await family.save();
    await PushToken.deleteMany({ userId: new Types.ObjectId(parentId) });
    await User.deleteOne({ _id: parentId, role: 'parent' });
    return 'left';
  }
  await deleteFamilyData(familyId);
  return 'family';
}
