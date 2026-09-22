/**
 * In-memory snapshot of the last successful tab fetch.
 * Survives leaving a screen so the next visit paints immediately.
 * Cleared on logout.
 */
const store = new Map<string, unknown>();

export const ScreenCacheKey = {
  parentDashboard: 'parent-dashboard',
  parentTasks: 'parent-tasks',
  parentRewards: 'parent-rewards',
  parentKids: 'parent-kids',
  parentLearn: 'parent-learn',
  kidHome: 'kid-home',
  kidTasks: 'kid-tasks',
  kidShop: 'kid-shop',
  kidLearn: 'kid-learn',
} as const;

export function readScreenCache<T>(key: string): T | undefined {
  if (!store.has(key)) return undefined;
  return store.get(key) as T;
}

export function writeScreenCache<T>(key: string, value: T) {
  store.set(key, value);
}

export function clearScreenCache() {
  store.clear();
}

/** True when this screen already has a snapshot from earlier in the session. */
export function hasScreenCache(key: string): boolean {
  return store.has(key);
}
