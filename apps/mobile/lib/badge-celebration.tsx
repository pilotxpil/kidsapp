import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
import { BADGES, BADGE_REWARDS, type BadgeUnlock } from '@kidsapp/shared';
import { useAuth } from './auth';
import { Celebration } from '../components/Celebration';
import { t } from './i18n';

interface BadgeCelebrationContextValue {
  celebrateBadges: (badges: BadgeUnlock[]) => void;
}

const BadgeCelebrationContext = createContext<BadgeCelebrationContextValue>({
  celebrateBadges: () => {},
});

export function useCelebrateBadges() {
  return useContext(BadgeCelebrationContext).celebrateBadges;
}

function badgeMessage(unlock: BadgeUnlock): string {
  const badge = BADGES[unlock.id];
  const name = badge?.label ?? unlock.id;
  if (unlock.xpAwarded > 0) {
    return `${name}\n+${unlock.xpAwarded} ${t('points')}`;
  }
  return name;
}

export function BadgeCelebrationProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [queue, setQueue] = useState<BadgeUnlock[]>([]);
  const [current, setCurrent] = useState<BadgeUnlock | null>(null);
  const prevBadgesRef = useRef<string[] | null>(null);

  const celebrateBadges = useCallback((badges: BadgeUnlock[]) => {
    if (!badges.length) return;
    setQueue((q) => [...q, ...badges]);
    if (prevBadgesRef.current) {
      prevBadgesRef.current = [
        ...new Set([...prevBadgesRef.current, ...badges.map((b) => b.id)]),
      ];
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    const badges = user?.badges ?? [];
    if (prevBadgesRef.current === null) {
      prevBadgesRef.current = badges;
      return;
    }
    const prev = new Set(prevBadgesRef.current);
    const newly = badges.filter((id) => !prev.has(id));
    if (newly.length > 0) {
      celebrateBadges(
        newly.map((id) => ({ id, xpAwarded: BADGE_REWARDS[id] ?? 0 }))
      );
    }
    prevBadgesRef.current = badges;
  }, [user?.badges, celebrateBadges]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue((q) => q.slice(1));
  }, [current, queue]);

  const handleDone = () => setCurrent(null);

  return (
    <BadgeCelebrationContext.Provider value={{ celebrateBadges }}>
      {children}
      <Celebration
        visible={!!current}
        icon={current ? BADGES[current.id]?.icon ?? '🏅' : undefined}
        kicker={t('badgeUnlocked')}
        message={current ? badgeMessage(current) : ''}
        sfx="complete"
        onDone={handleDone}
      />
    </BadgeCelebrationContext.Provider>
  );
}
