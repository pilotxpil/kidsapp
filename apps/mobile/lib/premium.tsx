import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  FREE_LIMITS,
  type AppRuntimeConfig,
  type FamilyEntitlements,
  type FamilyPlan,
  type PlanLimits,
  type PremiumFeature,
} from '@kidsapp/shared';
import { api, isPremiumRequired } from './api';
import { useAuth } from './auth';
import { initPurchases } from './purchases';
import { toast } from '../components/ui/Toast';

const DEFAULT_CONFIG: AppRuntimeConfig = {
  adsEnabled: true,
  billingEnabled: false,
  passwordResetEnabled: true,
  supportEmail: 'support@kids.synaboard.com',
  minSupportedVersion: '1.0.0',
};

interface PremiumContextValue {
  loaded: boolean;
  plan: FamilyPlan;
  isPremium: boolean;
  limits: PlanLimits;
  entitlements: FamilyEntitlements | null;
  config: AppRuntimeConfig;
  billingEnabled: boolean;
  refresh: () => Promise<void>;
  /** After a purchase / restore: server re-verifies with RevenueCat. */
  sync: () => Promise<FamilyEntitlements | null>;
  openPaywall: (feature?: PremiumFeature) => void;
}

const Ctx = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [entitlements, setEntitlements] = useState<FamilyEntitlements | null>(null);
  const [config, setConfig] = useState<AppRuntimeConfig>(DEFAULT_CONFIG);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getAppConfig().then(setConfig).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getBillingStatus();
      setEntitlements(res.entitlements);
      setBillingEnabled(res.billingEnabled);
    } catch {
      // Older API or offline: treat as free without blocking the app.
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEntitlements(null);
      setLoaded(false);
      return;
    }
    void refresh();
    if (user.role === 'parent') void initPurchases(user.familyId);
  }, [user?._id, user?.familyId, user?.role, refresh]);

  const sync = useCallback(async () => {
    const res = await api.syncBilling();
    setEntitlements(res.entitlements);
    setBillingEnabled(res.billingEnabled);
    return res.entitlements;
  }, []);

  const openPaywall = useCallback(
    (feature?: PremiumFeature) => {
      router.push({ pathname: '/premium', params: feature ? { feature } : {} });
    },
    [router]
  );

  const value = useMemo<PremiumContextValue>(
    () => ({
      loaded,
      plan: entitlements?.plan ?? 'free',
      isPremium: entitlements?.isPremium ?? false,
      limits: entitlements?.limits ?? FREE_LIMITS,
      entitlements,
      config,
      billingEnabled,
      refresh,
      sync,
      openPaywall,
    }),
    [loaded, entitlements, config, billingEnabled, refresh, sync, openPaywall]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePremium(): PremiumContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePremium outside PremiumProvider');
  return v;
}

/** One handler for every failed action: paywall for plan limits, a toast for everything else. */
export function useErrorHandler() {
  const { openPaywall } = usePremium();
  const { user } = useAuth();
  return useCallback(
    (err: unknown) => {
      if (isPremiumRequired(err)) {
        if (user?.role === 'parent') openPaywall(err.feature);
        else toast('זה פתוח רק במשפחות פרימיום. בקשו מההורים!', 'info');
        return;
      }
      toast(err instanceof Error ? err.message : 'משהו השתבש. נסו שוב.', 'error');
    },
    [openPaywall, user?.role]
  );
}
