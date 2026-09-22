import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Runs a load function when the screen gains focus.
 * Uses a ref for the loader so callback identity changes don't re-trigger fetches.
 * Returns true after the first attempt finishes (success or failure).
 */
export function useFocusLoad(loadFn: () => Promise<void>, enabled = true): boolean {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let active = true;

      (async () => {
        try {
          await loadRef.current();
        } catch {
          // Ignore fetch errors during logout / navigation away
        } finally {
          if (active) setReady(true);
        }
      })();

      return () => {
        active = false;
      };
    }, [enabled])
  );

  return ready;
}
