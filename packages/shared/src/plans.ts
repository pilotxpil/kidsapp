/**
 * Family plans (free / premium) — shared by server enforcement and the mobile paywall.
 *
 * - `free`: the core loop (tasks → points → rewards) with sensible limits, ads on parent screens.
 * - `premium`: paid subscription (RevenueCat entitlement `premium`), no ads, everything unlocked.
 * - `founder`: families that joined before the public launch — premium forever, never billed.
 */
import type { UiThemeId } from './index';

export type FamilyPlan = 'free' | 'premium' | 'founder';

export interface PlanLimits {
  /** Kid profiles per family. */
  maxKids: number;
  /** Active tasks assigned to a single kid. */
  maxActiveTasksPerKid: number;
  /** Active rewards in the family shop. */
  maxActiveRewards: number;
  /** Parents can author / import their own learning packs. */
  customLearningPacks: boolean;
  /** Learning results + mistakes insights for parents. */
  learningInsights: boolean;
  /** Premium worlds (themes) for kids and parents. */
  premiumThemes: boolean;
  /** Custom weekly family challenge (title / target / prize). */
  customFamilyChallenge: boolean;
  /** Ads on parent screens. Never shown on kid screens. */
  showAds: boolean;
}

export const FREE_LIMITS: PlanLimits = {
  maxKids: 2,
  maxActiveTasksPerKid: 15,
  maxActiveRewards: 10,
  customLearningPacks: false,
  learningInsights: false,
  premiumThemes: false,
  customFamilyChallenge: false,
  showAds: true,
};

export const PREMIUM_LIMITS: PlanLimits = {
  maxKids: 8,
  maxActiveTasksPerKid: 200,
  maxActiveRewards: 100,
  customLearningPacks: true,
  learningInsights: true,
  premiumThemes: true,
  customFamilyChallenge: true,
  showAds: false,
};

/** Worlds that need premium. Kids already using one keep it (server only blocks switching *to* it). */
export const PREMIUM_THEME_IDS: UiThemeId[] = ['brawl', 'sparkle'];

export function isPremiumTheme(id: UiThemeId): boolean {
  return PREMIUM_THEME_IDS.includes(id);
}

export function limitsForPlan(isPremium: boolean): PlanLimits {
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}

export interface FamilyUsage {
  kids: number;
  activeRewards: number;
  customLearningPacks: number;
}

export interface FamilyEntitlements {
  plan: FamilyPlan;
  isPremium: boolean;
  /** ISO date; absent for founders / lifetime. */
  premiumUntil?: string;
  /** Subscription will not renew (still premium until premiumUntil). */
  willRenew?: boolean;
  limits: PlanLimits;
  usage: FamilyUsage;
}

/** Store product ids (Google Play + App Store). Configure the same ids in RevenueCat. */
export const PREMIUM_PRODUCT_IDS = {
  monthly: 'kidsquest_premium_monthly',
  yearly: 'kidsquest_premium_yearly',
} as const;

/** RevenueCat entitlement identifier that unlocks premium. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Error code the API returns (HTTP 402) when a free family hits a premium limit. */
export const PREMIUM_REQUIRED_CODE = 'PREMIUM_REQUIRED';

export type PremiumFeature =
  | 'kids'
  | 'tasks'
  | 'rewards'
  | 'customPacks'
  | 'insights'
  | 'themes'
  | 'challenge';

export interface PremiumRequiredError {
  error: string;
  code: typeof PREMIUM_REQUIRED_CODE;
  feature: PremiumFeature;
}

/** Public runtime config served by GET /app/config (lets us toggle things without a store release). */
export interface AppRuntimeConfig {
  adsEnabled: boolean;
  billingEnabled: boolean;
  passwordResetEnabled: boolean;
  supportEmail: string;
  /** Oldest app version that still works with this API; older builds are told to update. */
  minSupportedVersion: string;
}

export const MIN_PASSWORD_LENGTH = 6;
