import type { Response } from 'express';
import {
  limitsForPlan,
  PREMIUM_REQUIRED_CODE,
  type FamilyEntitlements,
  type FamilyPlan,
  type PlanLimits,
  type PremiumFeature,
} from '@kidsapp/shared';
import { Family, IFamily } from '../models/Family';
import { User } from '../models/User';
import { Reward } from '../models/Reward';
import { FamilyLearningPack } from '../models/FamilyLearningPack';

export function familyPlan(family: Pick<IFamily, 'plan'> | null | undefined): FamilyPlan {
  return family?.plan ?? 'free';
}

export function isFamilyPremium(
  family: Pick<IFamily, 'plan' | 'premiumUntil'> | null | undefined,
  now = new Date()
): boolean {
  if (!family) return false;
  if (family.plan === 'founder') return true;
  if (family.plan !== 'premium') return false;
  return !family.premiumUntil || family.premiumUntil.getTime() > now.getTime();
}

export async function getFamilyLimits(familyId: string): Promise<{ isPremium: boolean; limits: PlanLimits }> {
  const family = await Family.findById(familyId).select('plan premiumUntil');
  const isPremium = isFamilyPremium(family);
  return { isPremium, limits: limitsForPlan(isPremium) };
}

export async function getFamilyEntitlements(familyId: string): Promise<FamilyEntitlements | null> {
  const family = await Family.findById(familyId);
  if (!family) return null;
  const isPremium = isFamilyPremium(family);
  const [kids, activeRewards, customLearningPacks] = await Promise.all([
    User.countDocuments({ familyId, role: 'kid' }),
    Reward.countDocuments({ familyId, isActive: true }),
    FamilyLearningPack.countDocuments({ familyId }),
  ]);
  return {
    plan: familyPlan(family),
    isPremium,
    ...(family.plan === 'premium' && family.premiumUntil
      ? { premiumUntil: family.premiumUntil.toISOString() }
      : {}),
    ...(family.plan === 'premium' && family.premiumWillRenew !== undefined
      ? { willRenew: family.premiumWillRenew }
      : {}),
    limits: limitsForPlan(isPremium),
    usage: { kids, activeRewards, customLearningPacks },
  };
}

const UPGRADE_HINT = 'שדרגו ל-KidsQuest פרימיום כדי לפתוח את זה.';

/** HTTP 402 with a Hebrew message (old app builds show `error` as-is) and a machine code for the paywall. */
export function sendPremiumRequired(res: Response, feature: PremiumFeature, message: string) {
  return res.status(402).json({
    error: `${message} ${UPGRADE_HINT}`,
    code: PREMIUM_REQUIRED_CODE,
    feature,
  });
}

type BooleanLimit = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

/** Express middleware: 402 unless the caller's family plan enables `flag`. */
export function requirePlanFlag(flag: BooleanLimit, feature: PremiumFeature, message: string) {
  return async (req: import('express').Request, res: Response, next: import('express').NextFunction) => {
    try {
      const { limits } = await getFamilyLimits(req.user!.familyId);
      if (!limits[flag]) return sendPremiumRequired(res, feature, message);
      next();
    } catch (err) {
      next(err);
    }
  };
}
