import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Runs a load function when the screen gains focus.
 * Uses a ref for the loader so callback identity changes don't re-trigger fetches.
 */
export function useFocusLoad(loadFn: () => Promise<void>) {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  const inFlightRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
          await loadRef.current();
        } finally {
          if (active) inFlightRef.current = false;
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );
}
