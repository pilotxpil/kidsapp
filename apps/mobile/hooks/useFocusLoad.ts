import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Runs a load function when the screen gains focus.
 * Uses a ref for the loader so callback identity changes don't re-trigger fetches.
 */
export function useFocusLoad(loadFn: () => Promise<void>, enabled = true) {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  const inFlightRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let active = true;

      (async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
          await loadRef.current();
        } catch {
          // Ignore fetch errors during logout / navigation away
        } finally {
          if (active) inFlightRef.current = false;
        }
      })();

      return () => {
        active = false;
      };
    }, [enabled])
  );
}
