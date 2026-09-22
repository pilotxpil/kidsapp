import { api } from './api';
import { ScreenCacheKey, hasScreenCache, writeScreenCache } from './screen-cache';
import type { FamilyTaskTemplate, Task } from '@kidsapp/shared';

/** Warm tab snapshots so the next page can paint before its own request returns. */
export function prefetchParentScreens() {
  if (!hasScreenCache(ScreenCacheKey.parentDashboard)) {
    void (async () => {
      const [dash, ch, ach] = await Promise.all([
        api.getDashboard(),
        api.getFamilyChallenge().catch(() => null),
        api.getFamilyAchievements().catch(() => null),
      ]);
      writeScreenCache(ScreenCacheKey.parentDashboard, {
        dashboard: dash.dashboard,
        challenge: ch?.challenge ?? null,
        achievements: ach?.achievements.slice(0, 8) ?? [],
      });
    })().catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.parentTasks)) {
    void loadParentTasksSnapshot()
      .then((snap) => writeScreenCache(ScreenCacheKey.parentTasks, snap))
      .catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.parentRewards)) {
    void api
      .getRewards()
      .then((res) => writeScreenCache(ScreenCacheKey.parentRewards, res.rewards))
      .catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.parentKids)) {
    void api
      .getKids()
      .then((res) => writeScreenCache(ScreenCacheKey.parentKids, res.kids))
      .catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.parentLearn)) {
    void (async () => {
      const [kidsRes, catalog] = await Promise.all([
        api.getKids(),
        api.getLearningCatalog(),
      ]);
      writeScreenCache(ScreenCacheKey.parentLearn, {
        kids: kidsRes.kids,
        items: catalog.items,
      });
    })().catch(() => undefined);
  }
}

export async function loadParentTasksSnapshot() {
  const kidsRes = await api.getKids();
  const kids = kidsRes.kids;
  const allTasks: Task[] = [];
  const seen = new Set<string>();
  for (const kid of kids) {
    const res = await api.getTasks(kid._id);
    for (const task of res.tasks) {
      if (!seen.has(task._id)) {
        seen.add(task._id);
        allTasks.push(task);
      }
    }
  }
  let familyTemplates: FamilyTaskTemplate[] = [];
  try {
    const templatesRes = await api.getTaskTemplates();
    familyTemplates = templatesRes.templates;
  } catch {
    familyTemplates = [];
  }
  let learningPacks: { id: string; title: string }[] = [];
  try {
    const catalog = await api.getLearningCatalog();
    learningPacks = catalog.items.slice(0, 40).map((item) => ({
      id: item.id,
      title: item.title.he || item.id,
    }));
  } catch {
    learningPacks = [];
  }
  return { kids, tasks: allTasks, familyTemplates, learningPacks };
}

export function prefetchKidScreens(userId: string) {
  if (!hasScreenCache(ScreenCacheKey.kidHome)) {
    void (async () => {
      const [profileRes, goalRes] = await Promise.all([
        api.getKidProfile(userId),
        api.getPersonalGoal().catch(() => ({ goal: null })),
      ]);
      writeScreenCache(ScreenCacheKey.kidHome, {
        profile: profileRes.profile,
        goal: goalRes.goal,
      });
    })().catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.kidTasks)) {
    void api
      .getTasks(userId)
      .then((res) => writeScreenCache(ScreenCacheKey.kidTasks, res.tasks))
      .catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.kidShop)) {
    void (async () => {
      const [rewardsRes, goalRes] = await Promise.all([
        api.getRewards(),
        api.getPersonalGoal().catch(() => ({ goal: null })),
      ]);
      writeScreenCache(ScreenCacheKey.kidShop, {
        rewards: rewardsRes.rewards,
        goal: goalRes.goal,
      });
    })().catch(() => undefined);
  }

  if (!hasScreenCache(ScreenCacheKey.kidLearn)) {
    void api
      .getLearningPacks()
      .then((res) =>
        writeScreenCache(ScreenCacheKey.kidLearn, {
          packs: res.packs,
          assignedOnly: !!res.assignedOnly,
        })
      )
      .catch(() => undefined);
  }
}
